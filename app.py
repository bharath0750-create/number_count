from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
import re

app = Flask(__name__)
app.config.from_object(Config)

mysql = MySQL(app)

def get_db_cursor():
    return mysql.connection.cursor()

def close_db_cursor(cursor):
    cursor.close()

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def classify_number(number):
    """Classify a number as 3D, 4D, or Invalid"""
    number = number.strip()
    if not number:
        return None
    if re.match(r'^\d{3}$', number):
        return '3D'
    elif re.match(r'^\d{4}$', number):
        return '4D'
    else:
        return 'Invalid'

def parse_numbers_input(input_text):
    """Parse input text into individual numbers"""
    if not input_text:
        return []
    
    # Replace commas with spaces, then split by whitespace
    normalized = input_text.replace(',', ' ')
    parts = normalized.split()
    
    numbers = []
    for part in parts:
        cleaned = part.strip()
        if cleaned:
            numbers.append(cleaned)
    return numbers

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            flash('Please enter both username and password.', 'danger')
            return render_template('login.html')
        
        cursor = get_db_cursor()
        cursor.execute("SELECT id, username, password_hash FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        close_db_cursor(cursor)
        
        if user and check_password_hash(user[2], password):
            session['user_id'] = user[0]
            session['username'] = user[1]
            session.permanent = True
            flash('Welcome back!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        if not all([full_name, username, email, password, confirm_password]):
            flash('All fields are required.', 'danger')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('register.html')
        
        if len(password) < 6:
            flash('Password must be at least 6 characters.', 'danger')
            return render_template('register.html')
        
        cursor = get_db_cursor()
        
        # Check if username exists
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            flash('Username already exists.', 'danger')
            close_db_cursor(cursor)
            return render_template('register.html')
        
        # Check if email exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            flash('Email already registered.', 'danger')
            close_db_cursor(cursor)
            return render_template('register.html')
        
        # Create user
        password_hash = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO users (full_name, username, email, password_hash) VALUES (%s, %s, %s, %s)",
            (full_name, username, email, password_hash)
        )
        mysql.connection.commit()
        close_db_cursor(cursor)
        
        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    user_id = session['user_id']
    cursor = get_db_cursor()
    
    # Get total counts
    cursor.execute("SELECT COUNT(*) FROM numbers WHERE user_id = %s", (user_id,))
    total_numbers = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM numbers WHERE user_id = %s AND number_type = '4D'", (user_id,))
    total_4d = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM numbers WHERE user_id = %s AND number_type = '3D'", (user_id,))
    total_3d = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM numbers WHERE user_id = %s AND number_type = 'Invalid'", (user_id,))
    total_invalid = cursor.fetchone()[0]
    
    # Get recent numbers for display
    cursor.execute("""
        SELECT id, number, number_type, created_at 
        FROM numbers 
        WHERE user_id = %s 
        ORDER BY created_at DESC 
        LIMIT 10
    """, (user_id,))
    recent_numbers = cursor.fetchall()
    close_db_cursor(cursor)
    
    return render_template('dashboard.html',
                         total_numbers=total_numbers,
                         total_4d=total_4d,
                         total_3d=total_3d,
                         total_invalid=total_invalid,
                         recent_numbers=recent_numbers,
                         username=session.get('username'))

@app.route('/add-numbers', methods=['GET', 'POST'])
@login_required
def add_numbers():
    if request.method == 'POST':
        numbers_input = request.form.get('numbers_input', '')
        numbers = parse_numbers_input(numbers_input)
        
        if not numbers:
            flash('No valid numbers found in input.', 'warning')
            return redirect(url_for('add_numbers'))
        
        user_id = session['user_id']
        cursor = get_db_cursor()
        
        added_count = 0
        invalid_count = 0
        
        for number in numbers:
            num_type = classify_number(number)
            if num_type:
                cursor.execute(
                    "INSERT INTO numbers (user_id, number, number_type) VALUES (%s, %s, %s)",
                    (user_id, number, num_type)
                )
                if num_type == 'Invalid':
                    invalid_count += 1
                else:
                    added_count += 1
        
        mysql.connection.commit()
        close_db_cursor(cursor)
        
        if added_count > 0:
            flash(f'Successfully added {added_count} number(s).', 'success')
        if invalid_count > 0:
            flash(f'{invalid_count} invalid number(s) were also recorded.', 'warning')
        
        return redirect(url_for('dashboard'))
    
    return render_template('add_numbers.html', username=session.get('username'))

@app.route('/numbers')
@login_required
def numbers():
    return numbers_filtered('all')

@app.route('/numbers/3d')
@login_required
def numbers_3d():
    return numbers_filtered('3D')

@app.route('/numbers/4d')
@login_required
def numbers_4d():
    return numbers_filtered('4D')

def numbers_filtered(filter_type):
    user_id = session['user_id']
    search_query = request.args.get('search', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = 20
    offset = (page - 1) * per_page
    
    cursor = get_db_cursor()
    
    # Build query
    where_clause = "WHERE user_id = %s"
    params = [user_id]
    
    if filter_type != 'all':
        where_clause += " AND number_type = %s"
        params.append(filter_type)
    
    if search_query:
        where_clause += " AND number LIKE %s"
        params.append(f"%{search_query}%")
    
    # Get total count
    count_query = f"SELECT COUNT(*) FROM numbers {where_clause}"
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]
    
    # Get paginated results
    data_query = f"""
        SELECT id, number, number_type, created_at 
        FROM numbers 
        {where_clause}
        ORDER BY created_at DESC 
        LIMIT %s OFFSET %s
    """
    params.extend([per_page, offset])
    cursor.execute(data_query, params)
    numbers_list = cursor.fetchall()
    close_db_cursor(cursor)
    
    total_pages = (total_count + per_page - 1) // per_page
    
    return render_template('numbers.html',
                         numbers=numbers_list,
                         filter_type=filter_type,
                         search_query=search_query,
                         page=page,
                         total_pages=total_pages,
                         total_count=total_count,
                         username=session.get('username'))

@app.route('/search')
@login_required
def search():
    return numbers_filtered('all')

@app.route('/delete-number/<int:number_id>', methods=['POST'])
@login_required
def delete_number(number_id):
    user_id = session['user_id']
    cursor = get_db_cursor()
    
    # Verify ownership before deleting
    cursor.execute("SELECT id FROM numbers WHERE id = %s AND user_id = %s", (number_id, user_id))
    if cursor.fetchone():
        cursor.execute("DELETE FROM numbers WHERE id = %s AND user_id = %s", (number_id, user_id))
        mysql.connection.commit()
        flash('Number deleted successfully.', 'success')
    else:
        flash('Number not found or unauthorized.', 'danger')
    
    close_db_cursor(cursor)
    
    # Redirect back to the referring page or numbers page
    referrer = request.headers.get('Referer')
    if referrer:
        return redirect(referrer)
    return redirect(url_for('numbers'))

@app.route('/profile')
@login_required
def profile():
    user_id = session['user_id']
    cursor = get_db_cursor()
    cursor.execute("SELECT id, full_name, username, email, created_at FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    close_db_cursor(cursor)
    
    return render_template('profile.html', user=user, username=session.get('username'))

@app.route('/api/stats')
@login_required
def api_stats():
    user_id = session['user_id']
    cursor = get_db_cursor()
    
    cursor.execute("SELECT COUNT(*) FROM numbers WHERE user_id = %s AND number_type = '3D'", (user_id,))
    total_3d = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM numbers WHERE user_id = %s AND number_type = '4D'", (user_id,))
    total_4d = cursor.fetchone()[0]
    
    close_db_cursor(cursor)
    
    return jsonify({
        'total_3d': total_3d,
        'total_4d': total_4d
    })

@app.route('/delete-all-numbers', methods=['POST'])
@login_required
def delete_all_numbers():
    user_id = session['user_id']
    cursor = get_db_cursor()
    
    cursor.execute("DELETE FROM numbers WHERE user_id = %s", (user_id,))
    deleted_count = cursor.rowcount
    mysql.connection.commit()
    close_db_cursor(cursor)
    
    flash(f'Successfully deleted {deleted_count} number(s).', 'success')
    return redirect(url_for('profile'))

@app.route('/delete-account', methods=['POST'])
@login_required
def delete_account():
    user_id = session['user_id']
    cursor = get_db_cursor()
    
    # Delete user's numbers first (foreign key constraint)
    cursor.execute("DELETE FROM numbers WHERE user_id = %s", (user_id,))
    
    # Delete user account
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    mysql.connection.commit()
    close_db_cursor(cursor)
    
    session.clear()
    flash('Your account has been permanently deleted.', 'info')
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)