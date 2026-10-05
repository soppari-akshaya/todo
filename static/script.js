const API_URL = "/api/todos";

let allTodos = [];


// Load tasks when page opens
document.addEventListener("DOMContentLoaded", function () {

    loadTodos();

    setToday();

});


// Set today's date
function setToday() {

    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    const dateString = `${year}-${month}-${day}`;

    document.getElementById("selectedDate").value = dateString;

    document.getElementById("currentDate").textContent =
        today.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        );

}


// Get tasks
async function loadTodos() {

    try {

        const response = await fetch(API_URL);

        allTodos = await response.json();

        displayTodos(allTodos);

        updateCategoryCounts(allTodos);

        filterTasksByDate();

    }
    catch (error) {

        console.log(error);

        alert("Unable to load tasks.");

    }

}


// Display tasks
function displayTodos(todos) {

    const todoList =
        document.getElementById("todoList");

    todoList.innerHTML = "";


    let completedCount = 0;


    todos.forEach(function (todo) {

        if (todo.completed === 1) {

            completedCount++;

        }


        const item =
            document.createElement("div");

        item.className = "todo-item";


        if (todo.completed === 1) {

            item.classList.add("completed");

        }


        const checkbox =
            document.createElement("button");

        checkbox.className = "check-box";

        checkbox.textContent =
            todo.completed === 1 ? "✓" : "";


        checkbox.onclick = function () {

            toggleTodo(
                todo.id,
                todo.completed
            );

        };


        const content =
            document.createElement("div");

        content.className = "todo-content";


        const title =
            document.createElement("div");

        title.className = "todo-title";

        title.textContent = todo.title;


        const description =
            document.createElement("div");

        description.className =
            "todo-description";

        description.textContent =
            todo.description || "";


        const category =
            document.createElement("span");

        category.className =
            "todo-category";

        category.textContent =
            todo.category || "Others";


        content.appendChild(title);

        if (todo.description) {

            content.appendChild(description);

        }

        content.appendChild(category);


        const buttons =
            document.createElement("div");

        buttons.className =
            "task-buttons";


        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "delete-button";

        deleteButton.textContent = "×";


        deleteButton.onclick = function () {

            deleteTodo(todo.id);

        };


        buttons.appendChild(deleteButton);


        item.appendChild(checkbox);

        item.appendChild(content);

        item.appendChild(buttons);


        todoList.appendChild(item);

    });


    const pendingCount =
        todos.length - completedCount;


    document.getElementById("taskSummary").textContent =
        `${todos.length} tasks • ${pendingCount} pending`;

}


// Update category cards
function updateCategoryCounts(todos) {

    let health = 0;

    let work = 0;

    let study = 0;

    let others = 0;


    todos.forEach(function (todo) {

        if (todo.category === "Health") {

            health++;

        }
        else if (todo.category === "Work") {

            work++;

        }
        else if (todo.category === "Study") {

            study++;

        }
        else {

            others++;

        }

    });


    document.getElementById("healthCount").textContent =
        health;

    document.getElementById("workCount").textContent =
        work;

    document.getElementById("studyCount").textContent =
        study;

    document.getElementById("othersCount").textContent =
        others;

}


// Open popup
function openAddTask() {

    document.getElementById("taskModal").style.display =
        "flex";

}


// Close popup
function closeAddTask() {

    document.getElementById("taskModal").style.display =
        "none";

}


// Add task
async function addTodo() {

    const title =
        document.getElementById("title").value.trim();

    const description =
        document.getElementById("description").value.trim();

    const category =
        document.getElementById("category").value;

    const dueDate =
        document.getElementById("due_date").value;


    if (title === "") {

        alert("Please enter a task title.");

        return;

    }


    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json"

            },

            body: JSON.stringify({

                title: title,

                description: description,

                category: category,

                due_date: dueDate

            })

        });


        if (!response.ok) {

            throw new Error(
                "Unable to add task"
            );

        }


        document.getElementById("title").value = "";

        document.getElementById("description").value = "";

        document.getElementById("category").value =
            "Health";

        document.getElementById("due_date").value = "";


        closeAddTask();

        loadTodos();

    }
    catch (error) {

        console.log(error);

        alert("Unable to add task.");

    }

}


// Complete / Undo
async function toggleTodo(id, currentStatus) {

    const todo =
        allTodos.find(function (item) {

            return item.id === id;

        });


    if (!todo) {

        return;

    }


    todo.completed =
        currentStatus === 1 ? 0 : 1;


    try {

        await fetch(
            `${API_URL}/${id}`,
            {

                method: "PUT",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify(todo)

            }
        );


        loadTodos();

    }
    catch (error) {

        console.log(error);

        alert("Unable to update task.");

    }

}


// Delete task
async function deleteTodo(id) {

    const confirmDelete =
        confirm(
            "Do you want to delete this task?"
        );


    if (!confirmDelete) {

        return;

    }


    try {

        await fetch(
            `${API_URL}/${id}`,
            {
                method: "DELETE"
            }
        );


        loadTodos();

    }
    catch (error) {

        console.log(error);

        alert("Unable to delete task.");

    }

}


// Filter calendar tasks
function filterTasksByDate() {

    const selectedDate =
        document.getElementById(
            "selectedDate"
        ).value;


    const calendarList =
        document.getElementById(
            "calendarTaskList"
        );


    calendarList.innerHTML = "";


    const filtered =
        allTodos.filter(function (todo) {

            return todo.due_date === selectedDate;

        });


    if (filtered.length === 0) {

        calendarList.innerHTML =
            `<p class="empty-message">
                No tasks for this date.
            </p>`;

        return;

    }


    filtered.forEach(function (todo) {

        const task =
            document.createElement("div");

        task.className =
            "calendar-task";

        task.textContent =
            todo.title;

        calendarList.appendChild(task);

    });
    

}
function scrollToCalendar() {

    const calendar =
        document.getElementById("calendarSection");

    calendar.scrollIntoView({
        behavior: "smooth"
    });

    calendar.style.boxShadow =
        "0 0 0 3px #52d273";

    setTimeout(function () {

        calendar.style.boxShadow = "none";

    }, 1000);

}