import { v4 as uuidv4 } from 'uuid';

// --- State Management ---
let recipes = [];
let menu = Array(14).fill(null); // Array to hold recipe IDs for 14 days

const storageKey = 'mealPlannerState';

function loadState() {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
        const state = JSON.parse(savedState);
        recipes = state.recipes || [];
        menu = state.menu || Array(14).fill(null);
    } else {
        // Add some sample recipes if storage is empty
        recipes = [
            { id: uuidv4(), title: 'Sample Spaghetti', ingredients: 'Pasta\nTomato Sauce\nGround Beef\nOnion', preparation: 'Cook pasta. Brown beef and onion. Add sauce. Combine with pasta.', isDefault: false },
            { id: uuidv4(), title: 'Default Salad Base', ingredients: 'Lettuce\nTomato\nCucumber', preparation: 'Wash and chop vegetables.', isDefault: true },
             { id: uuidv4(), title: 'Sample Chicken Stir-fry', ingredients: 'Chicken Breast\nBroccoli\nCarrots\nSoy Sauce\nRice', preparation: 'Cook rice. Stir-fry chicken and vegetables. Add soy sauce.', isDefault: false }
        ];
         menu = Array(14).fill(null); // Start with an empty menu
    }
}

function saveState() {
    const state = { recipes, menu };
    localStorage.setItem(storageKey, JSON.stringify(state));
}

// --- DOM Elements ---
const tabs = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');
const menuGrid = document.getElementById('menu-grid');
const favoritesList = document.getElementById('favorites-list');
const shoppingListOutput = document.getElementById('shopping-list-output');
const addRecipeBtn = document.getElementById('add-recipe-btn');
const recipeForm = document.getElementById('recipe-form');
const recipeIdInput = document.getElementById('recipe-id');
const recipeTitleInput = document.getElementById('recipe-title');
const recipeWebPasteInput = document.getElementById('recipe-web-paste');
const recipeIngredientsInput = document.getElementById('recipe-ingredients');
const recipePreparationInput = document.getElementById('recipe-preparation');
const recipeDefaultInput = document.getElementById('recipe-default');
const saveRecipeBtn = document.getElementById('save-recipe-btn');
const cancelRecipeBtn = document.getElementById('cancel-recipe-btn');
const generateShoppingListBtn = document.getElementById('generate-shopping-list-btn');
const selectRecipeModal = document.getElementById('select-recipe-modal');
const modalRecipeList = document.getElementById('modal-recipe-list');
const cancelSelectRecipeBtn = document.getElementById('cancel-select-recipe');

let currentMenuDayIndex = null; // To track which menu day is being edited

// --- Rendering ---
function renderMenu() {
    menuGrid.innerHTML = ''; // Clear current menu
    for (let i = 0; i < 14; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('menu-day');
        dayElement.innerHTML = `<h4>Day ${i + 1}</h4>`;

        const recipeId = menu[i];
        const recipe = recipes.find(r => r.id === recipeId);

        if (recipe) {
            dayElement.innerHTML += `<div class="meal-title">${recipe.title}</div>`;
            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remove-meal');
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => removeMealFromMenu(i));
            dayElement.appendChild(removeBtn);
        } else {
            const placeholder = document.createElement('div');
            placeholder.classList.add('add-meal-placeholder');
            placeholder.textContent = '+ Add Meal';
            placeholder.addEventListener('click', () => openRecipeModal(i));
            dayElement.appendChild(placeholder);
        }

        menuGrid.appendChild(dayElement);
    }
}

function renderFavorites() {
    favoritesList.innerHTML = ''; // Clear current list
    if (recipes.length === 0) {
        favoritesList.innerHTML = '<p>No favorite recipes added yet.</p>';
        return;
    }
    recipes.forEach(recipe => {
        const recipeElement = document.createElement('div');
        recipeElement.classList.add('recipe-item');
        recipeElement.innerHTML = `
            <h3>${recipe.title} ${recipe.isDefault ? '(Default)' : ''}</h3>
            <div class="recipe-details">
                <strong>Ingredients:</strong><br>${recipe.ingredients.replace(/\n/g, '<br>')}
            </div>
             <div class="recipe-details">
                <strong>Preparation:</strong><br>${recipe.preparation.replace(/\n/g, '<br>')}
            </div>
            <div class="recipe-actions">
                <button class="button" data-action="edit" data-id="${recipe.id}">Edit</button>
                <button class="button danger" data-action="delete" data-id="${recipe.id}">Delete</button>
                <button class="button ${recipe.isDefault ? 'default-off' : 'default-on'}" data-action="toggle-default" data-id="${recipe.id}">
                    ${recipe.isDefault ? 'Unmark Default' : 'Mark Default'}
                </button>
            </div>
        `;
        favoritesList.appendChild(recipeElement);
    });
}

function renderShoppingList(listItems) {
     if (listItems.length === 0) {
        shoppingListOutput.innerHTML = '<p>Your shopping list is empty. Add meals to your menu or mark recipes as default.</p>';
        return;
    }
    const ul = document.createElement('ul');
    listItems.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
    });
    shoppingListOutput.innerHTML = '';
    shoppingListOutput.appendChild(ul);
}

function renderModalRecipeList() {
    modalRecipeList.innerHTML = '';
    const nonDefaultRecipes = recipes.filter(r => !r.isDefault); // Only list non-defaults for manual selection
     if (nonDefaultRecipes.length === 0) {
        modalRecipeList.innerHTML = '<p>Add some recipes to your favorites to add them to the menu.</p>';
        return;
    }
    nonDefaultRecipes.forEach(recipe => {
        const recipeItem = document.createElement('div');
        recipeItem.classList.add('recipe-item-small');
        recipeItem.dataset.id = recipe.id;
        recipeItem.innerHTML = `
            <div class="recipe-title">${recipe.title}</div>
            <div class="recipe-ingredients-preview">${recipe.ingredients.split('\n').slice(0, 2).join(', ')}${recipe.ingredients.split('\n').length > 2 ? '...' : ''}</div>
        `;
        recipeItem.addEventListener('click', () => selectRecipeForMenu(recipe.id));
        modalRecipeList.appendChild(recipeItem);
    });
}


// --- Tab Navigation ---
function switchTab(tabId) {
    tabs.forEach(button => {
        if (button.dataset.tab === tabId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Trigger rendering or actions based on tab
    if (tabId === 'menu') {
        renderMenu();
    } else if (tabId === 'favorites') {
        renderFavorites();
        hideRecipeForm(); // Hide form when switching away
    } else if (tabId === 'shopping-list') {
        // Shopping list is generated on click, not automatically on tab switch
        shoppingListOutput.innerHTML = '<p>Click "Generate List" to see the ingredients needed for your planned menu and default recipes.</p>';
    }
     saveState(); // Save state whenever tab is switched (assuming changes might have happened)
}

tabs.forEach(button => {
    button.addEventListener('click', () => {
        switchTab(button.dataset.tab);
    });
});

// --- Recipe Form ---
function showRecipeForm(recipe = null) {
    recipeForm.classList.remove('hidden');
    favoritesList.classList.add('hidden');
    addRecipeBtn.classList.add('hidden');

    if (recipe) {
        recipeIdInput.value = recipe.id;
        recipeTitleInput.value = recipe.title;
        recipeIngredientsInput.value = recipe.ingredients;
        recipePreparationInput.value = recipe.preparation;
        recipeDefaultInput.checked = recipe.isDefault;
        recipeForm.querySelector('h3').textContent = 'Edit Recipe';
    } else {
        recipeIdInput.value = '';
        recipeTitleInput.value = '';
        recipeWebPasteInput.value = ''; // Clear web paste on new recipe
        recipeIngredientsInput.value = '';
        recipePreparationInput.value = '';
        recipeDefaultInput.checked = false;
        recipeForm.querySelector('h3').textContent = 'Add New Recipe';
    }
}

function hideRecipeForm() {
    recipeForm.classList.add('hidden');
    favoritesList.classList.remove('hidden');
    addRecipeBtn.classList.remove('hidden');
     // Clear form fields when hiding
    recipeIdInput.value = '';
    recipeTitleInput.value = '';
    recipeWebPasteInput.value = '';
    recipeIngredientsInput.value = '';
    recipePreparationInput.value = '';
    recipeDefaultInput.checked = false;
}

addRecipeBtn.addEventListener('click', () => showRecipeForm());
cancelRecipeBtn.addEventListener('click', () => hideRecipeForm());

saveRecipeBtn.addEventListener('click', () => {
    const id = recipeIdInput.value || uuidv4();
    const title = recipeTitleInput.value.trim();
    const ingredients = recipeIngredientsInput.value.trim();
    const preparation = recipePreparationInput.value.trim();
    const isDefault = recipeDefaultInput.checked;

    if (!title || !ingredients || !preparation) {
        alert('Please fill in title, ingredients, and preparation.');
        return;
    }

    const existingIndex = recipes.findIndex(r => r.id === id);
    const newRecipe = { id, title, ingredients, preparation, isDefault };

    if (existingIndex > -1) {
        recipes[existingIndex] = newRecipe; // Update existing
    } else {
        recipes.push(newRecipe); // Add new
    }

    saveState();
    renderFavorites();
    hideRecipeForm();
});

// Handle Edit/Delete/Toggle Default on Favorites list using event delegation
favoritesList.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName === 'BUTTON') {
        const action = target.dataset.action;
        const id = target.dataset.id;
        const recipe = recipes.find(r => r.id === id);

        if (!recipe) return;

        if (action === 'edit') {
            showRecipeForm(recipe);
        } else if (action === 'delete') {
            if (confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
                recipes = recipes.filter(r => r.id !== id);
                // Also remove from menu if it's assigned
                menu = menu.map(menuRecipeId => menuRecipeId === id ? null : menuRecipeId);
                saveState();
                renderFavorites();
                renderMenu(); // Update menu display if deleted recipe was used
            }
        } else if (action === 'toggle-default') {
            recipe.isDefault = !recipe.isDefault;
            saveState();
            renderFavorites(); // Re-render favorites to show updated default status
             // Shopping list calculation relies on defaults, so prompt regeneration
             shoppingListOutput.innerHTML = '<p>Defaults changed. Click "Generate List" to update the shopping list.</p>';
        }
    }
});

// --- Menu Interaction ---
function openRecipeModal(dayIndex) {
    currentMenuDayIndex = dayIndex;
    renderModalRecipeList();
    selectRecipeModal.classList.remove('hidden');
}

function closeRecipeModal() {
    selectRecipeModal.classList.add('hidden');
    currentMenuDayIndex = null;
}

cancelSelectRecipeBtn.addEventListener('click', closeRecipeModal);

function selectRecipeForMenu(recipeId) {
    if (currentMenuDayIndex !== null) {
        menu[currentMenuDayIndex] = recipeId;
        saveState();
        renderMenu();
        closeRecipeModal();
         // Menu changed, prompt shopping list regeneration
         shoppingListOutput.innerHTML = '<p>Menu changed. Click "Generate List" to update the shopping list.</p>';
    }
}

function removeMealFromMenu(dayIndex) {
    if (confirm

