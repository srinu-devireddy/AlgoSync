import React from "react";
import './ProblemCard.css'

const ProblemCard = ({ problem, onBookmark, isBookmarked }) => {
  
  const extractContestInfo = () => {
    if (!problem.description) return null;

    // Example description: "Problem from Codeforces Contest 2124 - I"
    const regex = /Contest\s+(\d+)\s*-\s*([A-Z0-9]+)/i;
    const match = problem.description.match(regex);
    if (!match) return null;

    return {
      contestId: match[1],
      index: match[2],
    };
  };

  const contestInfo = extractContestInfo();

  const getCodeforcesURL = () => {
    if (!contestInfo) return "#";
    return `https://codeforces.com/contest/${contestInfo.contestId}/problem/${contestInfo.index}`;
  };

  const openProblem = () => {
    const url = getCodeforcesURL();
    if (url === "#") {
      alert("No valid Codeforces URL found.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`problem-card ${isBookmarked ? 'bookmarked' : ''}`}>
      <div className="card-details">
        <div className="card-header">
          <h3 className="problem-title">{problem.name || problem.title || "Untitled Problem"}</h3>
          {isBookmarked && <span className="bookmark-indicator">★</span>}
        </div>
        
        {problem.description && <p className="problem-desc">{problem.description}</p>}
        
        <div className="problem-meta">
          <span className="pill diff-pill">
            {problem.difficulty || "Unrated"}
          </span>
          {problem.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="pill text-pill">{tag}</span>
          ))}
        </div>
      </div>

      <div className="card-actions">
        {contestInfo && (
          <button onClick={openProblem} className="action-btn primary-action">
            Solve Problem
          </button>
        )}
        <button 
          onClick={() => onBookmark(problem)} 
          className="action-btn secondary-action"
          disabled={isBookmarked}
        >
          {isBookmarked ? 'Saved' : 'Bookmark'}
        </button>
      </div>
    </div>
  );
};

export default ProblemCard;
