import { targetWords, dictionary } from "./modules/data.js";

const currentDate = new Date();
const PREFIX = `WORDLE-${currentDate.getDate()}`;
const WORD_LENGTH = 5;
const AMOUNT_OF_GUESSES = 6;
const FLIP_ANIM_DURATION = 500;
const DANCE_ANIM_DURATION = 500;
const offsetFromDate = new Date(2022, 0, 1);
const msOffset = Date.now() - offsetFromDate;
const dayOffset = msOffset / 1000 / 60 / 60 / 24;
const targetWord = targetWords[Math.floor(dayOffset)];

const alertContainer = document.querySelector("[data-alert-container]");
const keyboard = document.querySelector("[data-keyboard]");
const guessGrid = document.querySelector("[data-guess-grid]");
guessGrid.style.setProperty("--WORD-LENGTH", WORD_LENGTH);
guessGrid.style.setProperty("--AMOUNT-OF-GUESSES", AMOUNT_OF_GUESSES);
for (let i = 0; i < WORD_LENGTH * AMOUNT_OF_GUESSES; i++) {
  let tile = document.createElement("div");
  tile.classList.add("tile");
  guessGrid.append(tile);
}

var arr = [];
for (var i = 0; i < localStorage.length; i++) {
  if (localStorage.key(i).substring(0, 7) == "WORDLE-") {
    arr.push(localStorage.key(i));
  }
}
for (var i = 0; i < arr.length; i++) {
  if (arr[i] === `${PREFIX}-GUESS`) continue;
  localStorage.removeItem(arr[i]);
}

const remainingTiles = guessGrid.querySelectorAll(":not([data-letter])");
const local = JSON.parse(localStorage.getItem(`${PREFIX}-GUESS`));
if (local) {
  let oldItems = local;
  oldItems.forEach((guess) => {
    if (guess.letters.length > 5) return;
    for (let i = 0; i < guess.letters.length; i++) {
      const key = keyboard.querySelector(`[data-key="${guess.letters[i].letter}"i]`);
      key.classList.add(guess.letters[i].state);
      const nextTile = guessGrid.querySelector(":not([data-letter])");
      nextTile.dataset.letter = guess.letters[i].letter.toLowerCase();
      nextTile.textContent = guess.letters[i].letter;
      nextTile.dataset.state = guess.letters[i].state;
    }
  });
}

const alreadyGuessed = local?.some((obj) => obj.word.correct === true) || false;
if (remainingTiles.length === 0 || alreadyGuessed) {
  showAlert(targetWord.toUpperCase(), null);
  stopInteraction();
} else {
  startInteraction();
}

function startInteraction() {
  document.addEventListener("click", handleMouseClick);
  document.addEventListener("keydown", handleKeyPress);
}

function stopInteraction() {
  document.removeEventListener("click", handleMouseClick);
  document.removeEventListener("keydown", handleKeyPress);
}

function handleMouseClick(e) {
  if (e.target.matches("[data-key]")) {
    pressKey(e.target.dataset.key);
    return;
  }

  if (e.target.matches("[data-enter]")) {
    submitGuess();
    return;
  }

  if (e.target.matches("[data-delete]")) {
    deleteKey();
    return;
  }
}

function handleKeyPress(e) {
  if (e.key === "Enter") {
    submitGuess();
    return;
  }

  if (e.key === "Backspace" || e.key === "Delete") {
    deleteKey();
    return;
  }

  if (e.key.match(/^[a-z]$/)) {
    pressKey(e.key);
    return;
  }
}

function pressKey(key) {
  const activeTiles = getActiveTiles();
  if (activeTiles.length >= WORD_LENGTH) return;
  const nextTile = guessGrid.querySelector(":not([data-letter])");
  nextTile.dataset.letter = key.toLowerCase();
  nextTile.textContent = key;
  nextTile.dataset.state = "active";
  nextTile.classList.add("new-letter");
  nextTile.addEventListener("animationend", () => {
    nextTile.classList.remove("new-letter");
  });
}

function deleteKey() {
  const activeTiles = getActiveTiles();
  const lastTile = activeTiles[activeTiles.length - 1];
  if (lastTile == null) return;
  lastTile.textContent = "";
  delete lastTile.dataset.state;
  delete lastTile.dataset.letter;
}

function submitGuess() {
  const activeTiles = [...getActiveTiles()];
  if (activeTiles.length !== WORD_LENGTH) {
    showAlert("Not enough letters!");
    shakeTiles(activeTiles);
    return;
  }

  const guess = activeTiles.reduce((word, tile) => {
    return word + tile.dataset.letter;
  }, "");

  if (!dictionary.includes(guess)) {
    showAlert("Not in word list!");
    shakeTiles(activeTiles);
    return;
  }

  stopInteraction();
  let oldItems = JSON.parse(localStorage.getItem(`${PREFIX}-GUESS`)) || [];
  let letters = [];
  activeTiles.forEach((tile, index) => {
    let state;
    if (targetWord[index] === tile.dataset.letter) {
      state = "correct";
    } else if (targetWord.includes(tile.dataset.letter)) {
      state = "wrong-location";
    } else {
      state = "wrong";
    }
    return letters.push({ letter: tile.dataset.letter, state: state });
  });
  oldItems.push({ word: { guess: guess, correct: guess === targetWord }, letters: letters });
  localStorage.setItem(`${PREFIX}-GUESS`, JSON.stringify(oldItems));
  activeTiles.forEach((...params) => flipTile(...params, guess));
}

function getActiveTiles() {
  return document.querySelectorAll('[data-state="active"]');
}

function showAlert(message, duration = 1000) {
  const alert = document.createElement("div");
  alert.textContent = message;
  alert.classList.add("alert");
  alertContainer.prepend(alert);
  if (duration == null) return;

  setTimeout(() => {
    alert.classList.add("hide");
    alert.addEventListener("transitionend", () => {
      alert.remove();
    });
  }, duration);
}

function shakeTiles(tiles) {
  tiles.forEach((tile) => {
    tile.classList.add("shake");
    tile.addEventListener(
      "animationend",
      () => {
        tile.classList.remove("shake");
      },
      { once: true }
    );
  });
}

function flipTile(tile, index, array, guess) {
  const letter = tile.dataset.letter;
  const key = keyboard.querySelector(`[data-key="${letter}"i]`);
  setTimeout(() => {
    tile.classList.add("flip");
  }, (index * FLIP_ANIM_DURATION) / 2);

  tile.addEventListener("transitionend", () => {
    tile.classList.remove("flip");
    if (targetWord[index] === letter) {
      tile.dataset.state = "correct";
      key.classList.add("correct");
    } else if (targetWord.includes(letter)) {
      tile.dataset.state = "wrong-location";
      key.classList.add("wrong-location");
    } else {
      tile.dataset.state = "wrong";
      key.classList.add("wrong");
    }

    if (index === array.length - 1) {
      tile.addEventListener(
        "transitionend",
        () => {
          startInteraction();
          checkWinLose(guess, array);
        },
        { once: true }
      );
    }
  });
}

function checkWinLose(guess, tiles) {
  if (guess === targetWord) {
    showAlert("You win", 5000);
    danceTiles(tiles);
    stopInteraction();
    return;
  }

  const remainingTiles = guessGrid.querySelectorAll(":not([data-letter])");
  if (remainingTiles.length === 0) {
    showAlert(targetWord.toUpperCase(), null);
    stopInteraction();
  }
}

function danceTiles(tiles) {
  tiles.forEach((tile, index) => {
    setTimeout(() => {
      tile.classList.add("dance");
      tile.addEventListener(
        "animationend",
        () => {
          tile.classList.remove("dance");
        },
        { once: true }
      );
    }, (index * DANCE_ANIM_DURATION) / 5);
  });
}
