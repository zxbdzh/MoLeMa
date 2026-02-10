import React from 'react';
import { Device } from '../../../hooks/useAudioRecorder';

interface DeviceSelectorProps {
  devices: Device[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
}

export function DeviceSelector({ devices, selectedDeviceId, onDeviceChange }: DeviceSelectorProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        选择麦克风
      </label>
      <select
        value={selectedDeviceId}
        onChange={(e) => onDeviceChange(e.target.value)}
        className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
      >
        {devices.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
    </div>
  );
}
