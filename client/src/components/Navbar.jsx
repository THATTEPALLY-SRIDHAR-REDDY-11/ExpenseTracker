export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="logo-dot" aria-hidden />
        <div>
          <h1 className="navbar-title">AI Budget Tracker</h1>
          <p className="navbar-sub">Upload receipts — Gemini extracts the details</p>
        </div>
      </div>
    </header>
  );
}
