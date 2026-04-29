// --- entrance.js (修正版) ---

document.addEventListener('DOMContentLoaded', () => {
    const enterButton = document.getElementById('enter-button');

    enterButton.addEventListener('click', () => {
        document.body.classList.add('fade-out');

        setTimeout(() => {
            // --- ここを修正 (ページ遷移を有効化) ---
            window.location.href = '3d-space.html';
            // --------------------------------------
        }, 1000);
    });
});