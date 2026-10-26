export default function Header({ engineStatus, modelsReady }) {
  return (
    <header className="site-header">
      <a className="brand" href="./">Face</a>
      <div className="local-badge" title={engineStatus}>
        <span className={`status-dot ${modelsReady ? 'ready' : ''}`} />
        <span>{modelsReady ? 'Ready' : 'Loading'}</span>
      </div>
    </header>
  );
}
