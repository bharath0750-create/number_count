# 3D & 4D Number Counter

A professional, responsive web application for managing and counting 3D (3-digit) and 4D (4-digit) numbers with user authentication.

## Features

- **User Authentication**: Registration, login, logout with secure password hashing
- **Number Classification**: Automatically classifies numbers as 3D (3 digits), 4D (4 digits), or Invalid
- **Duplicate Support**: Allows repeated numbers - each entry is counted individually
- **Dashboard**: Visual statistics with cards and charts
- **Number Management**: Add, view, search, filter, and delete numbers
- **User Isolation**: Each user only sees their own data
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Built with Bootstrap 5 and custom styling

## Tech Stack

- **Backend**: Python 3.8+, Flask 3.0
- **Database**: MySQL 8.0+
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3
- **Authentication**: Flask Sessions, Werkzeug password hashing
- **Charting**: Chart.js

## Project Structure

```
number-counter/
├── app.py                 # Main Flask application
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── README.md              # This file
├── database/
│   └── schema.sql         # Database schema
├── static/
│   ├── css/
│   │   └── style.css      # Custom styles
│   └── js/
│       └── app.js         # Client-side JavaScript
└── templates/
    ├── base.html          # Base template
    ├── login.html         # Login page
    ├── register.html      # Registration page
    ├── dashboard.html     # Main dashboard
    ├── add_numbers.html   # Add numbers page
    ├── numbers.html       # Numbers list (all/3D/4D)
    └── profile.html       # User profile
```

## Installation

### Prerequisites

- Python 3.8 or higher
- MySQL 8.0 or higher
- pip (Python package manager)

### Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd number-counter
   ```

2. **Create a virtual environment** (recommended)
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up the database**
   - Create a MySQL database named `number_counter`
   - Run the schema:
     ```bash
     mysql -u root -p < database/schema.sql
     ```
   - Or manually execute the SQL in `database/schema.sql`

5. **Configure environment variables**
   Create a `.env` file in the project root:
   ```env
   SECRET_KEY=your-super-secret-key-here
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DB=number_counter
   MYSQL_PORT=3306
   ```

6. **Run the application**
   ```bash
   python app.py
   ```

7. **Access the application**
   Open your browser and go to: `http://localhost:5000`

## Usage

### Registration & Login
1. Visit the application - you'll be redirected to the login page
2. Click "Register" to create a new account
3. Fill in your details (full name, username, email, password)
4. Login with your credentials

### Adding Numbers
1. Click "Add Numbers" in the navigation
2. Paste your numbers in the textarea (supports multiple formats):
   - One per line: `1234` / `5678` / `123`
   - Comma-separated: `1234, 5678, 123`
   - Space-separated: `1234 5678 123`
   - Mixed formats
3. Click "ADD NUMBERS"
4. View the preview showing counts before submitting

### Viewing Numbers
- **Dashboard**: Overview with statistics cards and chart
- **All Numbers**: Complete list with pagination
- **3D Numbers**: Filtered view of 3-digit numbers only
- **4D Numbers**: Filtered view of 4-digit numbers only
- **Search**: Use the search box to find specific numbers
- **Filters**: Switch between All/3D/4D using the filter buttons

### Managing Numbers
- **Delete**: Click the trash icon next to any number to delete that specific entry
- **Profile**: View account statistics and manage account settings

## Number Classification Rules

| Input | Classification | Example |
|-------|---------------|---------|
| Exactly 3 digits | 3D | `001`, `123`, `999` |
| Exactly 4 digits | 4D | `0001`, `1234`, `9999` |
| Anything else | Invalid | `12`, `12345`, `abc`, `12a` |

**Important**: Leading zeros are preserved. Duplicate numbers are counted as separate entries.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/login` | User login |
| GET/POST | `/register` | User registration |
| GET | `/logout` | User logout |
| GET | `/dashboard` | Main dashboard |
| GET/POST | `/add-numbers` | Add numbers page |
| GET | `/numbers` | All numbers list |
| GET | `/numbers/3d` | 3D numbers list |
| GET | `/numbers/4d` | 4D numbers list |
| GET | `/search` | Search numbers |
| POST | `/delete-number/<id>` | Delete specific number |
| POST | `/delete-all-numbers` | Delete all user's numbers |
| POST | `/delete-account` | Delete user account |
| GET | `/profile` | User profile |
| GET | `/api/stats` | JSON statistics |

## Database Schema

### Users Table
```sql
users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Numbers Table
```sql
numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    number VARCHAR(10) NOT NULL,
    number_type ENUM('3D', '4D', 'Invalid') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

**Note**: No UNIQUE constraint on `number` column - duplicates are explicitly allowed.

## Security Features

- Password hashing using Werkzeug (PBKDF2 with SHA-256)
- Session-based authentication
- SQL injection prevention via parameterized queries
- User data isolation (all queries filter by user_id)
- CSRF protection via Flask's session management
- Secure HTTP headers

## Configuration

Key configuration options in `config.py`:

```python
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
MYSQL_DB = os.environ.get('MYSQL_DB', 'number_counter')
MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))
SESSION_COOKIE_SECURE = False  # Set True in production with HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
PERMANENT_SESSION_LIFETIME = 1800  # 30 minutes
```

## Production Deployment

1. **Use a production WSGI server** (Gunicorn):
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

2. **Set secure environment variables**:
   ```env
   SECRET_KEY=generate-a-strong-random-key
   MYSQL_PASSWORD=strong-database-password
   SESSION_COOKIE_SECURE=True
   ```

3. **Use a reverse proxy** (Nginx/Apache) with SSL/TLS

4. **Enable MySQL SSL** for database connections

5. **Set up logging** and monitoring

## Development

### Running in Debug Mode
```bash
python app.py
```
The app runs on `http://localhost:5000` with auto-reload.

### Database Migrations
For schema changes, manually update `database/schema.sql` and apply to your database.

### Adding New Features
1. Add routes in `app.py`
2. Create templates in `templates/`
3. Add styles in `static/css/style.css`
4. Add scripts in `static/js/app.js`

## Troubleshooting

### MySQL Connection Issues
- Verify MySQL is running: `systemctl status mysql` (Linux) or check Services (Windows)
- Check credentials in `.env` file
- Ensure database `number_counter` exists
- Verify user has privileges: `GRANT ALL ON number_counter.* TO 'user'@'localhost'`

### Module Import Errors
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt`
- Check Python version compatibility

### Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # macOS/Linux

# Kill process and restart
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments
3. Open an issue on the repository

---

**Built with Flask, MySQL, and Bootstrap 5**