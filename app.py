from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

DATABASE = "todo.db"


# Connect to database
def get_db_connection():

    connection = sqlite3.connect(DATABASE)

    connection.row_factory = sqlite3.Row

    return connection


# Create database
def create_table():

    connection = get_db_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'Others',
            due_date TEXT,
            completed INTEGER DEFAULT 0
        )
    """)

    connection.commit()

    connection.close()


# Home page
@app.route("/")
def home():

    return render_template("index.html")


# Get all tasks
@app.route("/api/todos", methods=["GET"])
def get_todos():

    connection = get_db_connection()

    todos = connection.execute(
        "SELECT * FROM todos ORDER BY id DESC"
    ).fetchall()

    connection.close()

    return jsonify([dict(todo) for todo in todos])


# Add task
@app.route("/api/todos", methods=["POST"])
def add_todo():

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
        (title, description, category, due_date, completed)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
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


# Update task
@app.route("/api/todos/<int:todo_id>", methods=["PUT"])
def update_todo(todo_id):

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
        """,
        (
            title,
            description,
            category,
            due_date,
            completed,
            todo_id
        )
    )

    connection.commit()

    connection.close()

    return jsonify({
        "message": "Task updated successfully"
    })


# Delete task
@app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):

    connection = get_db_connection()

    connection.execute(
        "DELETE FROM todos WHERE id = ?",
        (todo_id,)
    )

    connection.commit()

    connection.close()

    return jsonify({
        "message": "Task deleted successfully"
    })


# Start application
if __name__ == "__main__":

    create_table()

    app.run(debug=True)