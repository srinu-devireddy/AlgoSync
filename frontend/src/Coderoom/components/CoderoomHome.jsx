import { useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import './CoderoomHome.css'

function Home() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const id = uuid();
    setRoomId(id);
    toast.success("Room ID generated!");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }

    navigate(`/chatroom/editor/${roomId}`, {
      state: { username },
    });

    toast.success("Room joined successfully!");
  };

  const handleInputEnter = (e) => {
    if (e.code === 'Enter') {
      joinRoom();
    }
  };

  return (
    <div className='editor-home-page'>
      <div className='editor-home-container'>
        <Navbar transparent={true} />
        
        <div className='form-container coderoom-form'>
          <h1 className='main-head'>Join Code Room</h1>
          <p className='subtitle'>Collaborate in real-time</p>

          <div className='input-group'>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Room ID"
              onKeyUp={handleInputEnter}
            />
          </div>
          <div className='input-group'>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              onKeyUp={handleInputEnter}
            />
          </div>
          
          <button onClick={joinRoom} className='primary-btn join-btn'>JOIN ROOM</button>

          <p className='create_info'>
            Don't have a room ID?{' '}
            <span onClick={generateRoomId} className='new-room-link'>
              Create New Room
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
