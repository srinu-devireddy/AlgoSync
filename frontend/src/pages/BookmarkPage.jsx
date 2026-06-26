import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "./BookmarkPage.css"

const BookmarksPage = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please login to view your bookmarks.");
          return;
        }

        const res = await fetch("http://localhost:5000/api/bookmarks", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Failed to fetch bookmarks.");
          return;
        }

        setBookmarks(data);
      } catch (err) {
        console.error("Error fetching bookmarks:", err);
        setError("Server error while fetching bookmarks.");
      }
    };

    fetchBookmarks();
  }, []);

  // Helper function to extract contest info from a problem description string
  const extractContestInfo = (content) => {
    if (!content) return null;

    // Example description: "Problem from Codeforces Contest 2124 - I"
    const regex = /Contest\s+(\d+)\s*-\s*([A-Z0-9]+)/i;
    const match = content.match(regex);
    if (!match) return null;

    return {
      contestId: match[1],
      index: match[2],
    };
  };

  // Given a problem description, get the Codeforces URL
  const getCodeforcesURL = (content) => {
    const contestInfo = extractContestInfo(content);
    if (!contestInfo) return "#";
    return `https://codeforces.com/contest/${contestInfo.contestId}/problem/${contestInfo.index}`;
  };

  // Opens the problem in a new tab, given its description
  const openProblem = (content) => {
    const url = getCodeforcesURL(content);
    if (url === "#") {
      alert("No valid Codeforces URL found.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-container">
        <Navbar transparent={true} />
        
        <div className="bookmarks-header">
          <h2 className="title">Your Bookmarks</h2>
          <p className="subtitle">Saved problems for later viewing</p>
        </div>

        {error && <p className="error-message">{error}</p>}
        {bookmarks.length === 0 && !error ? (
          <div className="empty-state">
            <p>No bookmarks yet.</p>
            <span>Start saving problems to see them here!</span>
          </div>
        ) : (
          <ul className="bookmarks-list">
            {bookmarks.map((bookmark) => (
              <li key={bookmark._id} className="bookmark-card">
                <div className="bookmark-content">
                  <h4 className="problem-name">{bookmark.name}</h4>
                  <p className="description">{bookmark.content}</p>
                  
                  <div className="meta-tags">
                    <span className="pill difficulty-pill">
                      {bookmark.difficulty || 'Unrated'}
                    </span>
                    {bookmark.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="pill tag-pill">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="bookmark-actions">
                  <button onClick={() => openProblem(bookmark.content)} className="primary-btn">
                    Solve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BookmarksPage;
