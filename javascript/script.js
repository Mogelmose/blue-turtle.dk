const adgangskoder = {
  "Andreas": "1234",
  "Mads": "abcd",
  "Oliver": "kode123"
};
function playSuccessSoundAndRedirect() {
  const successSound = new Audio('../sound/pissegodt.mp3'); 
  successSound.addEventListener('ended', function() {
    window.location.href = "forside.html";
  });

  // Start afspilningen af lyden
  successSound.play();
}
function playErrorSound() {
  // Ret stien hvis nødvendigt. Dette er lyden for en fejl.
  const errorSound = new Audio('../sound/snake.mp3'); 
  errorSound.play();
}
function showLogin(name) {
  document.querySelector('.profiles').style.display = 'none';
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('bruger').value = name;
  document.getElementById('fejlbesked').textContent = '';
  document.getElementById('kode').value = '';
}

function goBack() {
  document.getElementById('loginForm').classList.add('hidden');
  document.querySelector('.profiles').style.display = 'flex';
  document.getElementById('fejlbesked').textContent = '';
  document.getElementById('kode').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const bruger = document.getElementById('bruger').value;
    const kode = document.getElementById('kode').value;
    const fejlbesked = document.getElementById('fejlbesked');

    if (adgangskoder[bruger] === kode) {
      playSuccessSoundAndRedirect()
    } else {
      fejlbesked.textContent = "Forkert adgangskode";
      playErrorSound(); 
      document.getElementById('kode').value = ''; // Nulstil kodefelt
    }
  });
});
