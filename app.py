from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import sqlite3
import os

from werkzeug.security import generate_password_hash, check_password_hash

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

app = Flask(__name__)

app.secret_key = "todo-secret-key-change-this"

DATABASE = "todo.db"

firebase_key_path = os.path.join(
    app.root_path,
    "firebase-service-account.json"
)

if not firebase_admin._apps:
    cred = credentials.Certificate(firebase_key_path)
    firebase_admin.initialize_app(cred)
# --------------------------------------------------
# DATABASE CONNECTION
# --------------------------------------------------

def get_db_connection():

    connection = sqlite3.connect(DATABASE)

    connection.row_factory = sqlite3.Row

    return connection


# --------------------------------------------------
# CREATE DATABASE TABLES
# --------------------------------------------------

def create_tables():

    connection = get_db_connection()

    # Users table
    connection.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    # Check whether todos table already exists
    table = connection.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type='table'
        AND name='todos'
    """).fetchone()


    if table is None:

        connection.execute("""
            CREATE TABLE todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT 'Others',
                due_date TEXT,
                completed INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

    else:

        # Check whether user_id already exists
        columns = connection.execute(
            "PRAGMA table_info(todos)"
        ).fetchall()

        column_names = [column["name"] for column in columns]


        if "user_id" not in column_names:

            connection.execute("""
                ALTER TABLE todos
                ADD COLUMN user_id INTEGER
            """)


    connection.commit()

    connection.close()


# --------------------------------------------------
# HOME PAGE
# --------------------------------------------------

@app.route("/")
def home():

    if "user_id" not in session:

        return redirect(url_for("login"))

    return render_template("index.html")


# --------------------------------------------------
# REGISTER PAGE
# --------------------------------------------------

@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        name = request.form["name"].strip()

        email = request.form["email"].strip().lower()

        password = request.form["password"]


        if not name or not email or not password:

            return render_template(
                "register.html",
                error="All fields are required."
            )


        connection = get_db_connection()


        # Check if email already exists
        existing_user = connection.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        ).fetchone()


        if existing_user:

            connection.close()

            return render_template(
                "register.html",
                error="Email already registered."
            )


        # Hash password
        hashed_password = generate_password_hash(password)


        cursor = connection.execute(
            """
            INSERT INTO users
            (name, email, password)
            VALUES (?, ?, ?)
            """,
            (
                name,
                email,
                hashed_password
            )
        )


        connection.commit()

        user_id = cursor.lastrowid


        # If this is the first user,
        # assign old tasks to this user.
        user_count = connection.execute(
            "SELECT COUNT(*) AS count FROM users"
        ).fetchone()["count"]


        if user_count == 1:

            connection.execute(
                """
                UPDATE todos
                SET user_id = ?
                WHERE user_id IS NULL
                """,
                (user_id,)
            )

            connection.commit()


        connection.close()


        return redirect(url_for("login"))


    return render_template("register.html")


# --------------------------------------------------
# LOGIN PAGE
# --------------------------------------------------

@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"].strip().lower()

        password = request.form["password"]


        connection = get_db_connection()


        user = connection.execute(
            """
            SELECT *
            FROM users
            WHERE email = ?
            """,
            (email,)
        ).fetchone()


        connection.close()


        if user and check_password_hash(
            user["password"],
            password
        ):

            session["user_id"] = user["id"]

            session["user_name"] = user["name"]

            session["user_email"] = user["email"]


            return redirect(url_for("home"))


        return render_template(
            "login.html",
            error="Invalid email or password."
        )


    return render_template("login.html")


# --------------------------------------------------
# LOGOUT
# --------------------------------------------------

@app.route("/logout")
def logout():

    session.clear()

    return redirect(url_for("login"))


# --------------------------------------------------
# GET ALL TASKS
# --------------------------------------------------

@app.route("/api/todos", methods=["GET"])
def get_todos():

    if "user_id" not in session:

        return jsonify({
            "error": "Please login first."
        }), 401


    connection = get_db_connection()


    todos = connection.execute(
        """
        SELECT *
        FROM todos
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (session["user_id"],)
    ).fetchall()


    connection.close()


    return jsonify([
        dict(todo)
        for todo in todos
    ])


# --------------------------------------------------
# ADD TASK
# --------------------------------------------------

@app.route("/api/todos", methods=["POST"])
def add_todo():

    if "user_id" not in session:

        return jsonify({
            "error": "Please login first."
        }), 401


    data = request.get_json()


    title = data.get("title")

    description = data.get("description", "")

    category = data.get("category", "Others")

    due_date = data.get("due_date", "")


    if not title:

        return jsonify({
            "error": "Title is required"
        }), 400


    connection = get_db_connection()


    cursor = connection.execute(
        """
        INSERT INTO todos
        (
            user_id,
            title,
            description,
            category,
            due_date,
            completed
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            session["user_id"],
            title,
            description,
            category,
            due_date,
            0
        )
    )


    connection.commit()

    todo_id = cursor.lastrowid

    connection.close()


    return jsonify({
        "message": "Task added successfully",
        "id": todo_id
    }), 201


# --------------------------------------------------
# UPDATE TASK
# --------------------------------------------------

@app.route("/api/todos/<int:todo_id>", methods=["PUT"])
def update_todo(todo_id):

    if "user_id" not in session:

        return jsonify({
            "error": "Please login first."
        }), 401


    data = request.get_json()


    title = data.get("title")

    description = data.get("description", "")

    category = data.get("category", "Others")

    due_date = data.get("due_date", "")

    completed = data.get("completed", 0)


    connection = get_db_connection()


    connection.execute(
        """
        UPDATE todos

        SET
            title = ?,
            description = ?,
            category = ?,
            due_date = ?,
            completed = ?

        WHERE id = ?
        AND user_id = ?
        """,
        (
            title,
            description,
            category,
            due_date,
            completed,
            todo_id,
            session["user_id"]
        )
    )


    connection.commit()

    connection.close()


    return jsonify({
        "message": "Task updated successfully"
    })


# --------------------------------------------------
# DELETE TASK
# --------------------------------------------------

@app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):

    if "user_id" not in session:

        return jsonify({
            "error": "Please login first."
        }), 401


    connection = get_db_connection()


    connection.execute(
        """
        DELETE FROM todos

        WHERE id = ?

        AND user_id = ?
        """,
        (
            todo_id,
            session["user_id"]
        )
    )


    connection.commit()

    connection.close()


    return jsonify({
        "message": "Task deleted successfully"
    })
@app.route("/api/all-user-tasks", methods=["GET"])
def get_all_user_tasks():
    connection = get_db_connection()

    tasks = connection.execute(
        """
        SELECT
            users.name,
            users.email,
            todos.id,
            todos.title,
            todos.description,
            todos.category,
            todos.due_date,
            todos.completed
        FROM users
        JOIN todos
        ON users.id = todos.user_id
        ORDER BY users.name, todos.due_date
        """
    ).fetchall()

    connection.close()

    return jsonify([dict(task) for task in tasks])
@app.route("/auth/google", methods=["POST"])
def google_login():

    data = request.get_json()

    id_token = data.get("idToken")

    if not id_token:
        return jsonify({
            "error": "Firebase ID token is missing."
        }), 400

    try:

        decoded_token = firebase_auth.verify_id_token(id_token)

        firebase_uid = decoded_token["uid"]
        email = decoded_token.get("email")
        name = decoded_token.get("name") or email.split("@")[0]

        connection = get_db_connection()

        user = connection.execute(
            """
            SELECT *
            FROM users
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if user is None:

            random_password = generate_password_hash(
                firebase_uid
            )

            cursor = connection.execute(
                """
                INSERT INTO users
                (name, email, password)
                VALUES (?, ?, ?)
                """,
                (
                    name,
                    email,
                    random_password
                )
            )

            connection.commit()

            user_id = cursor.lastrowid

        else:

            user_id = user["id"]

        connection.close()

        session["user_id"] = user_id
        session["user_name"] = name
        session["user_email"] = email

        return jsonify({
            "message": "Google login successful"
        })

    except Exception as error:

        print("Google authentication error:", error)

        return jsonify({
            "error": "Google authentication failed."
        }), 401
# --------------------------------------------------
# START APPLICATION
# --------------------------------------------------

if __name__ == "__main__":

    create_tables()

    app.run(debug=True)