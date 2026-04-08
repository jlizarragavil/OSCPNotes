document.addEventListener("DOMContentLoaded", () => {
    const navHTML = `
    <nav>
        <a href="index.html">Home</a>

        <div class="dropdown">
            <a href="#">AD ▾</a>
            <div class="dropdown-content">
                <a href="enumeration.html">Enumeration</a>
                <a href="attacking.html">Attacking</a>
                <a href="lateralMovement.html">Lateral Movement</a>
                <a href="metodologie.html">Methodology</a>
            </div>
        </div>

        <a href="windows_privesc.html">Windows PrivEsc</a>
        <a href="linux-privesc.html">Linux Privesc</a>
        <a href="file-transfer.html">File Transfer</a>
        <a href="checklist.html">Checklist</a>
        <a href="pivoting.html">Pivoting</a>
    </nav>
    `;

    document.getElementById("nav-placeholder").innerHTML = navHTML;
});