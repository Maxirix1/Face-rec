export default function ResultsBar({ results, threshold, onThresholdChange }) {
  return (
    <section className="results-bar" aria-labelledby="results-heading">
      <div className="results-main">
        <h2 id="results-heading">Match</h2>
        <div className="result-items">
          {results.map((item, index) => (
            item.muted ? (
              <span key={`muted-${index}`} className="muted">{item.label}</span>
            ) : (
              <span
                key={`${item.label}-${index}`}
                className={`result-tag${item.matched ? '' : ' unknown'}`}
              >
                {item.label}
                {item.distance != null && (
                  <small>{item.distance.toFixed(3)}</small>
                )}
              </span>
            )
          ))}
        </div>
      </div>

      <div className="threshold-setting">
        <label htmlFor="threshold">
          <span>Threshold</span>
          <output id="threshold-value" htmlFor="threshold">
            {threshold.toFixed(2)}
          </output>
        </label>
        <input
          id="threshold"
          type="range"
          min="0.35"
          max="0.70"
          step="0.01"
          value={threshold}
          onChange={(event) => onThresholdChange(event.target.value)}
        />
      </div>
    </section>
  );
}
