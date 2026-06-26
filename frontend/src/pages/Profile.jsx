import { useEffect, useState } from 'react';
import './ProfilePage.css'
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Profile = () => {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Rating states
  const [cfData, setCfData] = useState(null);
  const [lcData, setLcData] = useState(null);
  const [cfLoading, setCfLoading] = useState(false);
  const [lcLoading, setLcLoading] = useState(false);

  useEffect(() => {
    const fetchFn = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`);
        const data = await response.json();
        setUserData(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchFn();
  }, [userId]);

  // Fetch Ratings once userData is available
  useEffect(() => {
    if (!userData || !userData.handles) return;

    const fetchCodeforces = async () => {
      const handle = userData.handles.codeforces;
      if (!handle) return;
      setCfLoading(true);
      try {
        const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
        const json = await res.json();
        if (json.status === "OK") {
          setCfData(json.result[0]);
        }
      } catch (err) {
        console.error("Failed to fetch CF data", err);
      }
      setCfLoading(false);
    };

    const fetchLeetcode = async () => {
      const handle = userData.handles.leetcode;
      if (!handle) return;
      setLcLoading(true);
      try {
        const res = await fetch(`https://alfa-leetcode-api.onrender.com/${handle}`);
        const json = await res.json();
        if (!json.errors) {
          setLcData(json);
        }
      } catch (err) {
        console.error("Failed to fetch LC data", err);
      }
      setLcLoading(false);
    };

    fetchCodeforces();
    fetchLeetcode();
  }, [userData]);

  if (loading) return <div className="profile-page"><p className="loading-text">Loading profile...</p></div>;
  if (!userData) return <div className="profile-page"><p className="loading-text">No user data found</p></div>;

  return (
    <div className='profile-page'>
      <div className='profile-container'>
        <Navbar transparent={true} />
        
        <div className='profile-card'>
          <h1 className='profile-head'>User Profile</h1>

          <div className='profile-header'>
            <img src='/avatar.png' alt='usericon' className='avatar-img'/>
            <div className='user-info'> 
              <span className='username'>{userData.username}</span>
              <span className='email'>{userData.email}</span>
            </div>
          </div>

          <div className='details-box'>
            <div className='detail-element'>
              <div className='detail-left'>
                <img src='/institute.jpg' alt='institute' className='detail-icon'/>
                <span>Institute</span> 
              </div>
              <span className='detail-right'>{userData.institute || 'N/A'}</span>
            </div>

            <div className='detail-element'>
              <div className='detail-left'>
                <img src='/city.png' alt='city' className='detail-icon'/>
                <span>City</span> 
              </div>
              <span className='detail-right'>{userData.city || 'N/A'}</span>
            </div>

            <div className='detail-element'>
              <div className='detail-left'>
                <img src='/country.png' alt='country' className='detail-icon'/>
                <span>Country</span> 
              </div>
              <span className='detail-right'>{userData.country || 'N/A'}</span>
            </div>

            <div className='detail-element'>
              <div className='detail-left'>
                <img src='/bio.png' alt='bio' className='detail-icon'/>
                <span>Bio</span> 
              </div>
              <span className='detail-right'>{userData.bio || 'N/A'}</span>
            </div>

            <div className='detail-element last-element'>
              <div className='detail-left'>
                <img src='/git.png' alt='git' className='detail-icon'/>
                <span>Github</span> 
              </div>
              <span className='detail-right'>
                {userData.handles?.github ? (
                  <a href={`https://github.com/${userData.handles.github}`} target="_blank" rel="noopener noreferrer">
                    {userData.handles.github}
                  </a>
                ) : 'N/A'}
              </span>
            </div>
          </div>

          {/* Ratings Section */}
          <div className='ratings-container'>
            <h2 className='ratings-head'>Competitive Programming Stats</h2>
            <div className='ratings-grid'>
              
              {/* Codeforces Card */}
              <div className='rating-card cf-card'>
                <div className='rating-card-header'>
                  <img src='/codeforces.png' alt='codeforces' className='platform-icon'/>
                  <h3>Codeforces</h3>
                </div>
                {cfLoading ? (
                  <p className='rating-info'>Loading stats...</p>
                ) : cfData ? (
                  <div className='rating-stats'>
                    <div className='stat-row'>
                      <span className='stat-label'>Handle:</span>
                      <span className={`stat-val cf-${cfData.rank?.replace(/\s+/g, '-')} font-bold`}>{cfData.handle}</span>
                    </div>
                    <div className='stat-row'>
                      <span className='stat-label'>Rating:</span>
                      <span className='stat-val'>{cfData.rating || 'Unrated'}</span>
                    </div>
                    <div className='stat-row'>
                      <span className='stat-label'>Max Rating:</span>
                      <span className='stat-val'>{cfData.maxRating || 'Unrated'}</span>
                    </div>
                    <div className='stat-row'>
                      <span className='stat-label'>Rank:</span>
                      <span className='stat-val capitalize'>{cfData.rank || 'Unrated'}</span>
                    </div>
                  </div>
                ) : (
                  <p className='rating-info'>{userData.handles?.codeforces ? 'Failed to fetch' : 'No handle provided'}</p>
                )}
              </div>

              {/* LeetCode Card */}
              <div className='rating-card lc-card'>
                <div className='rating-card-header'>
                  {/* Using a placeholder SVG or img for Leetcode */}
                  <img src='https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png' alt='leetcode' className='platform-icon lc-icon'/>
                  <h3>LeetCode</h3>
                </div>
                {lcLoading ? (
                  <p className='rating-info'>Loading stats...</p>
                ) : lcData ? (
                  <div className='rating-stats'>
                    <div className='stat-row'>
                      <span className='stat-label'>Solved:</span>
                      <span className='stat-val font-bold text-lc'>{lcData.solvedProblem} / {lcData.totalQuestions}</span>
                    </div>
                    <div className='stat-row'>
                      <span className='stat-label'>Easy:</span>
                      <span className='stat-val lc-easy'>{lcData.easySolved}</span>
                    </div>
                    <div className='stat-row'>
                      <span className='stat-label'>Medium:</span>
                      <span className='stat-val lc-medium'>{lcData.mediumSolved}</span>
                    </div>
                    <div className='stat-row'>
                      <span className='stat-label'>Hard:</span>
                      <span className='stat-val lc-hard'>{lcData.hardSolved}</span>
                    </div>
                    <div className='stat-row'>
                      <span className='stat-label'>Ranking:</span>
                      <span className='stat-val'>{lcData.ranking}</span>
                    </div>
                  </div>
                ) : (
                  <p className='rating-info'>{userData.handles?.leetcode ? 'Failed to fetch' : 'No handle provided'}</p>
                )}
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default Profile