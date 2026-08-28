from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from functools import wraps
import sqlite3
import os
import re

app = Flask(__name__)
app.config.from_object(Config)

# Vercel allows temporary writes in /tmp
# For local development, use database/number_counter.db
if os.environ.get("VERCEL"):
    DATABASE = "/tmp/number_counter.db"
else:
    DATABASE = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "database",
        "number_counter.db"
    )


def get_db():
    """Create and return SQLite database connection."""
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)

    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_database():
    """Create required database tables."""
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS numbers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            number TEXT NOT NULL,
            number_type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


# Initialize database when application starts
init_database()


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for("login"))

        return f(*args, **kwargs)

    return decorated_function


def classify_number(number):
    """Classify a number as 3D, 4D, or Invalid."""

    number = number.strip()

    if not number:
        return None

    if re.match(r"^\d{3}$", number):
        return "3D"

    elif re.match(r"^\d{4}$", number):
        return "4D"

    else:
        return "Invalid"


def parse_numbers_input(input_text):
    """Parse input text into individual numbers."""

    if not input_text:
        return []

    normalized = input_text.replace(",", " ")
    parts = normalized.split()

    numbers = []

    for part in parts:
        cleaned = part.strip()

        if cleaned:
            numbers.append(cleaned)

    return numbers


@app.route("/")
def index():

    if "user_id" in session:
        return redirect(url_for("dashboard"))

    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        if not username or not password:
            flash("Please enter both username and password.", "danger")
            return render_template("login.html")

        conn = get_db()

        user = conn.execute(
            """
            SELECT id, username, password_hash
            FROM users
            WHERE username = ?
            """,
            (username,)
        ).fetchone()

        conn.close()

        if user and check_password_hash(user["password_hash"], password):

            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session.permanent = True

            flash("Welcome back!", "success")

            return redirect(url_for("dashboard"))

        else:

            flash("Invalid username or password.", "danger")

    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        full_name = request.form.get("full_name", "").strip()
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not all([
            full_name,
            username,
            email,
            password,
            confirm_password
        ]):
            flash("All fields are required.", "danger")
            return render_template("register.html")

        if password != confirm_password:
            flash("Passwords do not match.", "danger")
            return render_template("register.html")

        if len(password) < 6:
            flash("Password must be at least 6 characters.", "danger")
            return render_template("register.html")

        conn = get_db()

        existing_username = conn.execute(
            "SELECT id FROM users WHERE username = ?",
            (username,)
        ).fetchone()

        if existing_username:

            conn.close()

            flash("Username already exists.", "danger")

            return render_template("register.html")

        existing_email = conn.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        ).fetchone()

        if existing_email:

            conn.close()

            flash("Email already registered.", "danger")

            return render_template("register.html")

        password_hash = generate_password_hash(password)

        conn.execute(
            """
            INSERT INTO users
            (full_name, username, email, password_hash)
            VALUES (?, ?, ?, ?)
            """,
            (
                full_name,
                username,
                email,
                password_hash
            )
        )

        conn.commit()
        conn.close()

        flash(
            "Registration successful! Please log in.",
            "success"
        )

        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/logout")
def logout():

    session.clear()

    flash("You have been logged out.", "info")

    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():

    user_id = session["user_id"]

    conn = get_db()

    total_numbers = conn.execute(
        """
        SELECT COUNT(*)
        FROM numbers
        WHERE user_id = ?
        """,
        (user_id,)
    ).fetchone()[0]

    total_4d = conn.execute(
        """
        SELECT COUNT(*)
        FROM numbers
        WHERE user_id = ?
        AND number_type = '4D'
        """,
        (user_id,)
    ).fetchone()[0]

    total_3d = conn.execute(
        """
        SELECT COUNT(*)
        FROM numbers
        WHERE user_id = ?
        AND number_type = '3D'
        """,
        (user_id,)
    ).fetchone()[0]

    total_invalid = conn.execute(
        """
        SELECT COUNT(*)
        FROM numbers
        WHERE user_id = ?
        AND number_type = 'Invalid'
        """,
        (user_id,)
    ).fetchone()[0]

    recent_numbers = conn.execute(
        """
        SELECT id, number, number_type, created_at
        FROM numbers
        WHERE user_id = ?
        ORDER BY datetime(created_at) DESC
        LIMIT 10
        """,
        (user_id,)
    ).fetchall()

    conn.close()

    return render_template(
        "dashboard.html",
        total_numbers=total_numbers,
        total_4d=total_4d,
        total_3d=total_3d,
        total_invalid=total_invalid,
        recent_numbers=recent_numbers,
        username=session.get("username")
    )


@app.route("/add-numbers", methods=["GET", "POST"])
@login_required
def add_numbers():

    if request.method == "POST":

        numbers_input = request.form.get(
            "numbers_input",
            ""
        )

        numbers = parse_numbers_input(numbers_input)

        if not numbers:

            flash(
                "No valid numbers found in input.",
                "warning"
            )

            return redirect(url_for("add_numbers"))

        user_id = session["user_id"]

        conn = get_db()

        added_count = 0
        invalid_count = 0

        for number in numbers:

            num_type = classify_number(number)

            if num_type:

                conn.execute(
                    """
                    INSERT INTO numbers
                    (user_id, number, number_type)
                    VALUES (?, ?, ?)
                    """,
                    (
                        user_id,
                        number,
                        num_type
                    )
                )

                if num_type == "Invalid":
                    invalid_count += 1
                else:
                    added_count += 1

        conn.commit()
        conn.close()

        if added_count > 0:

            flash(
                f"Successfully added {added_count} number(s).",
                "success"
            )

        if invalid_count > 0:

            flash(
                f"{invalid_count} invalid number(s) were also recorded.",
                "warning"
            )

        return redirect(url_for("dashboard"))

    return render_template(
        "add_numbers.html",
        username=session.get("username")
    )


@app.route("/numbers")
@login_required
def numbers():

    return numbers_filtered("all")


@app.route("/numbers/3d")
@login_required
def numbers_3d():

    return numbers_filtered("3D")


@app.route("/numbers/4d")
@login_required
def numbers_4d():

    return numbers_filtered("4D")


def numbers_filtered(filter_type):

    user_id = session["user_id"]

    search_query = request.args.get(
        "search",
        ""
    ).strip()

    page = request.args.get(
        "page",
        1,
        type=int
    )

    if page < 1:
        page = 1

    per_page = 20

    offset = (page - 1) * per_page

    conn = get_db()

    where_clause = "WHERE user_id = ?"

    params = [user_id]

    if filter_type != "all":

        where_clause += " AND number_type = ?"

        params.append(filter_type)

    if search_query:

        where_clause += " AND number LIKE ?"

        params.append(
            f"%{search_query}%"
        )

    count_query = f"""
        SELECT COUNT(*)
        FROM numbers
        {where_clause}
    """

    total_count = conn.execute(
        count_query,
        params
    ).fetchone()[0]

    data_query = f"""
        SELECT id, number, number_type, created_at
        FROM numbers
        {where_clause}
        ORDER BY datetime(created_at) DESC
        LIMIT ? OFFSET ?
    """

    data_params = params + [
        per_page,
        offset
    ]

    numbers_list = conn.execute(
        data_query,
        data_params
    ).fetchall()

    conn.close()

    total_pages = (
        (total_count + per_page - 1)
        // per_page
    )

    return render_template(
        "numbers.html",
        numbers=numbers_list,
        filter_type=filter_type,
        search_query=search_query,
        page=page,
        total_pages=total_pages,
        total_count=total_count,
        username=session.get("username")
    )


@app.route("/search")
@login_required
def search():

    return numbers_filtered("all")


@app.route(
    "/delete-number/<int:number_id>",
    methods=["POST"]
)
@login_required
def delete_number(number_id):

    user_id = session["user_id"]

    conn = get_db()

    number = conn.execute(
        """
        SELECT id
        FROM numbers
        WHERE id = ?
        AND user_id = ?
        """,
        (
            number_id,
            user_id
        )
    ).fetchone()

    if number:

        conn.execute(
            """
            DELETE FROM numbers
            WHERE id = ?
            AND user_id = ?
            """,
            (
                number_id,
                user_id
            )
        )

        conn.commit()

        flash(
            "Number deleted successfully.",
            "success"
        )

    else:

        flash(
            "Number not found or unauthorized.",
            "danger"
        )

    conn.close()

    referrer = request.headers.get("Referer")

    if referrer:
        return redirect(referrer)

    return redirect(url_for("numbers"))


@app.route("/profile")
@login_required
def profile():

    user_id = session["user_id"]

    conn = get_db()

    user = conn.execute(
        """
        SELECT id, full_name, username, email, created_at
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    ).fetchone()

    conn.close()

    return render_template(
        "profile.html",
        user=user,
        username=session.get("username")
    )


@app.route("/api/stats")
@login_required
def api_stats():

    user_id = session["user_id"]

    conn = get_db()

    total_3d = conn.execute(
        """
        SELECT COUNT(*)
        FROM numbers
        WHERE user_id = ?
        AND number_type = '3D'
        """,
        (user_id,)
    ).fetchone()[0]

    total_4d = conn.execute(
        """
        SELECT COUNT(*)
        FROM numbers
        WHERE user_id = ?
        AND number_type = '4D'
        """,
        (user_id,)
    ).fetchone()[0]

    conn.close()

    return jsonify({
        "total_3d": total_3d,
        "total_4d": total_4d
    })


@app.route(
    "/delete-all-numbers",
    methods=["POST"]
)
@login_required
def delete_all_numbers():

    user_id = session["user_id"]

    conn = get_db()

    cursor = conn.execute(
        """
        DELETE FROM numbers
        WHERE user_id = ?
        """,
        (user_id,)
    )

    deleted_count = cursor.rowcount

    conn.commit()
    conn.close()

    flash(
        f"Successfully deleted {deleted_count} number(s).",
        "success"
    )

    return redirect(url_for("profile"))


@app.route(
    "/delete-account",
    methods=["POST"]
)
@login_required
def delete_account():

    user_id = session["user_id"]

    conn = get_db()

    conn.execute(
        """
        DELETE FROM numbers
        WHERE user_id = ?
        """,
        (user_id,)
    )

    conn.execute(
        """
        DELETE FROM users
        WHERE id = ?
        """,
        (user_id,)
    )

    conn.commit()
    conn.close()

    session.clear()

    flash(
        "Your account has been permanently deleted.",
        "info"
    )

    return redirect(url_for("login"))


if __name__ == "__main__":

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )
