#!/usr/bin/env python
"""
Database Initialization Script for 3D & 4D Number Counter

This script creates the database and tables if they don't exist.
Run this before starting the application for the first time.
"""

import os
import sys
import MySQLdb
from config import Config

def init_database():
    """Initialize the database and tables"""
    
    # Connect to MySQL server (without database)
    try:
        conn = MySQLdb.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            passwd=Config.MYSQL_PASSWORD,
            port=Config.MYSQL_PORT,
            charset='utf8mb4'
        )
        cursor = conn.cursor()
        
        # Create database if not exists
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{Config.MYSQL_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"Database '{Config.MYSQL_DB}' created or already exists.")
        
        # Use the database
        cursor.execute(f"USE `{Config.MYSQL_DB}`")
        
        # Read and execute schema
        schema_path = os.path.join(os.path.dirname(__file__), 'database', 'schema.sql')
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        for statement in statements:
            if statement:
                try:
                    cursor.execute(statement)
                    print(f"Executed: {statement[:50]}...")
                except MySQLdb.Error as e:
                    print(f"Error executing statement: {e}")
                    print(f"Statement: {statement[:100]}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\nDatabase initialization completed successfully!")
        print(f"Database: {Config.MYSQL_DB}")
        print(f"Host: {Config.MYSQL_HOST}:{Config.MYSQL_PORT}")
        
    except MySQLdb.Error as e:
        print(f"MySQL Error: {e}")
        print("\nPlease check:")
        print("1. MySQL server is running")
        print("2. Credentials in config.py or .env are correct")
        print("3. User has CREATE DATABASE privileges")
        sys.exit(1)
    except FileNotFoundError:
        print(f"Schema file not found at: {schema_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    print("Initializing 3D & 4D Number Counter Database...")
    print("=" * 50)
    init_database()