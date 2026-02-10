import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import AlertDialog from '../../components/ui/AlertDialog';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { DeviceSelector } from './components/DeviceSelector';
import { RecorderControls } from './components/RecorderControls';
import { RecordingList } from './components/RecordingList';

interface AudioRecorderProps {
    onClose?: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({onClose}) => {
    const {
        isRecording,
        duration,
        recordings,
        devices,
        selectedDeviceId,
        startRecording,
        stopRecording,
        deleteRecording,
        setDevice
    } = useAudioRecorder();

    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string | null }>({id: null});

    const handleDeleteClick = (id: string) => {
        setDeleteConfirm({id});
    };

    const confirmDelete = async () => {
        if (deleteConfirm.id) {
            const recording = recordings.find(r => r.id === deleteConfirm.id);
            if (recording) {
                await deleteRecording(recording.file_path);
            }
            setDeleteConfirm({id: null});
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">录音器</h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>

            <DeviceSelector 
                devices={devices} 
                selectedDeviceId={selectedDeviceId} 
                onDeviceChange={setDevice} 
            />

            <RecorderControls 
                isRecording={isRecording} 
                duration={duration} 
                onStart={startRecording} 
                onStop={stopRecording} 
            />

            <RecordingList 
                recordings={recordings} 
                onDelete={handleDeleteClick} 
            />

            {deleteConfirm.id !== null && ReactDOM.createPortal(
                <AlertDialog
                    isOpen={true}
                    type="warning"
                    title="确认删除"
                    message="确定要删除这条录音吗？"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfirm({id: null})}
                />,
                document.body
            )}
        </div>
    );
};
