// =====================================================
// GLOBAL VARIABLES
// =====================================================

let allTodos = [];


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    setCurrentDate();

    setDefaultDate();

    loadTodos();

    setupTaskForm();

});


// =====================================================
// CURRENT DATE
// =====================================================

function setCurrentDate() {

    const dateElement = document.getElementById("currentDate");

    if (!dateElement) {
        return;
    }

    const today = new Date();

    const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    };

    dateElement.textContent =
        today.toLocaleDateString("en-US", options);
}


// =====================================================
// DEFAULT DATE FOR NEW TASK
// =====================================================

function setDefaultDate() {

    const dateInput =
        document.getElementById("taskDueDate");

    const calendarInput =
        document.getElementById("selectedDate");

    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    const todayDate =
        `${year}-${month}-${day}`;

    if (dateInput) {
        dateInput.value = todayDate;
    }

    if (calendarInput) {
        calendarInput.value = todayDate;
    }
}


// =====================================================
// LOAD TODOS
// =====================================================

async function loadTodos() {

    try {

        const response =
            await fetch("/api/todos");

        if (response.status === 401) {

            window.location.href = "/login";

            return;
        }

        if (!response.ok) {

            throw new Error(
                "Unable to load tasks"
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {

            throw new Error(
                "Invalid task data"
            );
        }

        allTodos = data;

        displayTodayTasks();

        updateStatistics();

        updateCategoryCounts();

        filterTasksByDate();

    } catch (error) {

        console.error(error);

        const taskList =
            document.getElementById("taskList");

        if (taskList) {

            taskList.innerHTML = `
                <div class="empty-message">
                    Unable to load tasks.
                    Please refresh the page.
                </div>
            `;
        }
    }
}


// =====================================================
// DISPLAY TODAY'S TASKS
// =====================================================

function displayTodayTasks() {

    const taskList =
        document.getElementById("taskList");

    if (!taskList) {
        return;
    }

    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    const todayDate =
        `${year}-${month}-${day}`;


    const todayTodos =
        allTodos.filter(function (todo) {

            return todo.due_date === todayDate;

        });


    displayTasks(todayTodos);
}


// =====================================================
// DISPLAY TASKS
// =====================================================

function displayTasks(todos) {

    const taskList =
        document.getElementById("taskList");

    if (!taskList) {
        return;
    }

    taskList.innerHTML = "";


    if (todos.length === 0) {

        taskList.innerHTML = `
            <div class="empty-message">
                No tasks scheduled for today.
                <br>
                Click "Add Task" to create one.
            </div>
        `;

        return;
    }


    todos.forEach(function (todo) {

        const taskCard =
            document.createElement("div");

        taskCard.className = "task-card";

        if (todo.completed) {

            taskCard.classList.add("completed");

        }


        // CHECKBOX

        const checkbox =
            document.createElement("button");

        checkbox.className = "task-checkbox";

        if (todo.completed) {

            checkbox.classList.add("checked");

            checkbox.textContent = "✓";

        }

        checkbox.onclick = function () {

            toggleTodo(todo);

        };


        // TASK DETAILS

        const details =
            document.createElement("div");

        details.className = "task-details";


        // TITLE

        const title =
            document.createElement("div");

        title.className = "task-title";

        title.textContent = todo.title;


        // DESCRIPTION

        const description =
            document.createElement("div");

        description.className =
            "task-description";

        description.textContent =
            todo.description || "No description";


        // META

        const meta =
            document.createElement("div");

        meta.className = "task-meta";


        const category =
            document.createElement("span");

        category.className =
            "task-category";

        category.textContent =
            todo.category || "Others";


        const date =
            document.createElement("span");

        date.className = "task-date";

        date.textContent =
            formatDate(todo.due_date);


        meta.appendChild(category);

        meta.appendChild(date);


        details.appendChild(title);

        details.appendChild(description);

        details.appendChild(meta);


       // TASK ACTIONS

const taskActions =
    document.createElement("div");

taskActions.className =
    "task-actions";


// EDIT BUTTON

const editButton =
    document.createElement("button");

editButton.className =
    "edit-task-btn";

editButton.textContent = "✎";

editButton.title =
    "Edit task";

editButton.onclick = function () {

    openEditTask(todo);

};


// DELETE BUTTON

const deleteButton =
    document.createElement("button");

deleteButton.className =
    "delete-task-btn";

deleteButton.textContent = "×";

deleteButton.title =
    "Delete task";

deleteButton.onclick = function () {

    deleteTodo(todo.id);

};


taskActions.appendChild(editButton);

taskActions.appendChild(deleteButton);


        // ADD EVERYTHING

        taskCard.appendChild(checkbox);

        taskCard.appendChild(details);

       taskCard.appendChild(taskActions);

        taskList.appendChild(taskCard);

    });

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(dateString) {

    if (!dateString) {
        return "No date";
    }

    const date =
        new Date(dateString + "T00:00:00");

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric"
        }
    );
}


// =====================================================
// STATISTICS
// =====================================================

function updateStatistics() {

    const total =
        allTodos.length;

    const completed =
        allTodos.filter(function (todo) {

            return todo.completed == 1;

        }).length;

    const pending =
        total - completed;


    const totalElement =
        document.getElementById("totalTasks");

    const completedElement =
        document.getElementById("completedTasks");

    const pendingElement =
        document.getElementById("pendingTasks");


    if (totalElement) {

        totalElement.textContent =
            total;

    }

    if (completedElement) {

        completedElement.textContent =
            completed;

    }

    if (pendingElement) {

        pendingElement.textContent =
            pending;

    }

}


// =====================================================
// CATEGORY COUNTS
// =====================================================

function updateCategoryCounts() {

    const health =
        allTodos.filter(function (todo) {

            return todo.category === "Health";

        }).length;


    const work =
        allTodos.filter(function (todo) {

            return todo.category === "Work";

        }).length;


    const study =
        allTodos.filter(function (todo) {

            return todo.category === "Study";

        }).length;


    const others =
        allTodos.filter(function (todo) {

            return todo.category === "Others";

        }).length;


    document.getElementById(
        "healthCount"
    ).textContent = health;


    document.getElementById(
        "workCount"
    ).textContent = work;


    document.getElementById(
        "studyCount"
    ).textContent = study;


    document.getElementById(
        "othersCount"
    ).textContent = others;

}


// =====================================================
// FILTER BY CATEGORY
// =====================================================

function filterByCategory(category) {

    const filtered =
        allTodos.filter(function (todo) {

            return todo.category === category;

        });


    const taskList =
        document.getElementById("taskList");

    taskList.innerHTML = "";


    if (filtered.length === 0) {

        taskList.innerHTML = `
            <div class="empty-message">
                No ${category} tasks found.
            </div>
        `;

        return;
    }


    displayTasks(filtered);
}


// =====================================================
// SHOW ALL TODAY'S TASKS
// =====================================================

function showAllTodayTasks() {

    displayTodayTasks();

}


// =====================================================
// ADD TASK MODAL
// =====================================================

function openAddTask() {

    const modal =
        document.getElementById("addTaskModal");

    if (modal) {

        modal.classList.add("show");

    }

}
// =====================================================
// OPEN EDIT TASK
// =====================================================

function openEditTask(todo) {

    const modal =
        document.getElementById("addTaskModal");

    const modalLabel =
        document.getElementById("modalLabel");

    const modalTitle =
        document.getElementById("modalTitle");

    const saveButton =
        document.getElementById("saveTaskButton");


    // Change modal text

    modalLabel.textContent = "EDIT TASK";

    modalTitle.textContent = "Edit Task";

    saveButton.textContent = "Update Task";


    // Fill existing task details

    document.getElementById(
        "taskTitle"
    ).value = todo.title;


    document.getElementById(
        "taskDescription"
    ).value = todo.description || "";


    document.getElementById(
        "taskCategory"
    ).value = todo.category || "Others";


    document.getElementById(
        "taskDueDate"
    ).value = todo.due_date || "";


    // Store task ID

    document.getElementById(
        "taskForm"
    ).dataset.editingId = todo.id;


    // Show modal

    modal.classList.add("show");
}

function closeAddTask() {

    const modal =
        document.getElementById("addTaskModal");

    const form =
        document.getElementById("taskForm");

    const modalLabel =
        document.getElementById("modalLabel");

    const modalTitle =
        document.getElementById("modalTitle");

    const saveButton =
        document.getElementById("saveTaskButton");


    modal.classList.remove("show");


    // Reset form

    form.reset();


    // Remove edit mode

    delete form.dataset.editingId;


    // Return to Add Task mode

    modalLabel.textContent = "NEW TASK";

    modalTitle.textContent = "Add New Task";

    saveButton.textContent = "Add Task";


    // Set today's date again

    setDefaultDate();
}


// =====================================================
// TASK FORM
// =====================================================

function setupTaskForm() {

    const form =
        document.getElementById("taskForm");

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            await addTodo();

        }
    );

}


// =====================================================
// ADD TODO
// =====================================================

// =====================================================
// ADD OR UPDATE TODO
// =====================================================

async function addTodo() {

    const form =
        document.getElementById("taskForm");


    const title =
        document.getElementById(
            "taskTitle"
        ).value.trim();


    const description =
        document.getElementById(
            "taskDescription"
        ).value.trim();


    const category =
        document.getElementById(
            "taskCategory"
        ).value;


    const dueDate =
        document.getElementById(
            "taskDueDate"
        ).value;


    const editingId =
        form.dataset.editingId;


    // Validate title

    if (!title) {

        alert(
            "Please enter a task title."
        );

        return;
    }


    // Validate date

    if (!dueDate) {

        alert(
            "Please select a due date."
        );

        return;
    }


    try {

        let response;


        // =================================================
        // EDIT EXISTING TASK
        // =================================================

        if (editingId) {

            const oldTask =
                allTodos.find(function (todo) {

                    return todo.id ==
                        editingId;

                });


            response =
                await fetch(
                    `/api/todos/${editingId}`,
                    {

                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            title: title,

                            description:
                                description,

                            category:
                                category,

                            due_date:
                                dueDate,

                            completed:
                                oldTask
                                    ? oldTask.completed
                                    : 0

                        })

                    }
                );

        }


        // =================================================
        // CREATE NEW TASK
        // =================================================

        else {

            response =
                await fetch(
                    "/api/todos",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            title: title,

                            description:
                                description,

                            category:
                                category,

                            due_date:
                                dueDate

                        })

                    }
                );

        }


        // Login check

        if (response.status === 401) {

            window.location.href =
                "/login";

            return;
        }


        if (!response.ok) {

            throw new Error(
                "Unable to save task"
            );

        }


        // Close modal

        closeAddTask();


        // Refresh tasks

        await loadTodos();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to save task. Please try again."
        );

    }
}


// =====================================================
// TOGGLE TODO
// =====================================================

async function toggleTodo(todo) {

    try {

        const response =
            await fetch(
                `/api/todos/${todo.id}`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        title: todo.title,

                        description:
                            todo.description || "",

                        category:
                            todo.category || "Others",

                        due_date:
                            todo.due_date || "",

                        completed:
                            todo.completed ? 0 : 1

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to update task"
            );

        }


        await loadTodos();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to update task."
        );

    }

}


// =====================================================
// DELETE TODO
// =====================================================

async function deleteTodo(todoId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this task?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/todos/${todoId}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to delete task"
            );

        }


        await loadTodos();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete task."
        );

    }

}


// =====================================================
// CALENDAR TASKS
// =====================================================

function filterTasksByDate() {

    const dateInput =
        document.getElementById(
            "selectedDate"
        );

    const calendarList =
        document.getElementById(
            "calendarTaskList"
        );


    if (!dateInput || !calendarList) {
        return;
    }


    const selectedDate =
        dateInput.value;


    calendarList.innerHTML = "";


    const filtered =
        allTodos.filter(function (todo) {

            return todo.due_date === selectedDate;

        });


    if (filtered.length === 0) {

        calendarList.innerHTML = `
            <p class="empty-message">
                No tasks for this date.
            </p>
        `;

        return;
    }


    filtered.forEach(function (todo) {

        const task =
            document.createElement("div");

        task.className = "calendar-task";


        const title =
            document.createElement("span");

        title.textContent =
            todo.title;


        const deleteButton =
            document.createElement("button");

        deleteButton.className =
            "calendar-delete-button";

        deleteButton.textContent = "×";

        deleteButton.title =
            "Delete task";


        deleteButton.onclick =
            function () {

                deleteTodo(todo.id);

            };


        task.appendChild(title);

        task.appendChild(deleteButton);

        calendarList.appendChild(task);

    });

}


// =====================================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =====================================================

window.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById(
                "addTaskModal"
            );


        if (event.target === modal) {

            closeAddTask();

        }

    }
);


// =====================================================
// ESC KEY CLOSES MODAL
// =====================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            closeAddTask();

        }

    }
);