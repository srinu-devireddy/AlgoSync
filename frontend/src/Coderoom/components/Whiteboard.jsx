import React, { useEffect, useState, useRef } from "react";
import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { ACTIONS } from "../Actions";
import "./Whiteboard.css";

const Whiteboard = ({ socketRef, roomId }) => {
  const [editor, setEditor] = useState(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!editor || !socketRef.current) return;

    // Listen to local changes directly on the store
    const unsubscribe = editor.store.listen(
      (update) => {
        // If we are currently applying remote changes, ignore this local trigger
        if (isSyncingRef.current) return;

        // If the change was made by a "user" (not the system loading), broadcast it
        if (
          Object.keys(update.changes.added).length > 0 ||
          Object.keys(update.changes.updated).length > 0 ||
          Object.keys(update.changes.removed).length > 0
        ) {
          socketRef.current.emit(ACTIONS.WHITEBOARD_UPDATE, {
            roomId,
            elements: update.changes,
          });
        }
      },
      { source: "user", scope: "document" } // critical: only listen to "user" actions
    );

    // Listen to incoming socket changes
    const handleIncomingUpdate = ({ elements }) => {
      if (!elements) return;

      isSyncingRef.current = true;
      try {
        editor.store.mergeRemoteChanges(() => {
          const { added, updated, removed } = elements;
          
          if (added) {
            Object.values(added).forEach((record) => {
              if (record && record.id) editor.store.put([record]);
            });
          }

          if (updated) {
            Object.values(updated).forEach((recordArray) => {
              // updated changes look like [oldRecord, newRecord]
              const newRecord = recordArray[1];
              if (newRecord && newRecord.id) editor.store.put([newRecord]);
            });
          }

          if (removed) {
            Object.values(removed).forEach((record) => {
              if (record && record.id) editor.store.remove([record.id]);
            });
          }
        });
      } catch (err) {
        console.error("Whiteboard sync error:", err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    socketRef.current.on(ACTIONS.WHITEBOARD_UPDATE, handleIncomingUpdate);

    return () => {
      unsubscribe();
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.WHITEBOARD_UPDATE, handleIncomingUpdate);
      }
    };
  }, [editor, socketRef, roomId]);

  return (
    <div className="tldraw-container">
      <Tldraw
        onMount={setEditor}
        darkMode={true}
      />
    </div>
  );
};

export default Whiteboard;
