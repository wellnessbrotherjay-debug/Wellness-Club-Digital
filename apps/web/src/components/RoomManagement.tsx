import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Clock,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Building,
  DoorOpen,
  Droplets,
  Sparkles
} from 'lucide-react';
import { fetchSchedule, deleteScheduleEntry } from '../utils/scheduleData';

interface Room {
  id: string;
  name: string;
  capacity: number;
  type: 'studio' | 'gym' | 'pool' | 'spa';
  status: 'available' | 'maintenance' | 'occupied';
  lastUsed?: string;
  services?: string[];
  serviceCategory?: 'oil' | 'signature';
}

interface ServiceAllocation {
  id: string;
  name: string;
  category: 'oil' | 'signature';
  description: string;
  services: string[];
}

const RoomManagement: React.FC = () => {
  const serviceAllocations: ServiceAllocation[] = [
    {
      id: 'oil',
      name: 'Oil-Based Massage Services',
      category: 'oil',
      description: 'Relaxing, Slimming, Lymphatic',
      services: ['Relaxing Massage', 'Slimming Massage', 'Lymphatic Massage']
    },
    {
      id: 'signature',
      name: 'No.1 Signature Massage',
      category: 'signature',
      description: 'Premium massage service',
      services: ['No.1 Signature Massage']
    }
  ];

  const [rooms, setRooms] = useState<Room[]>([
    { id: '1', name: 'Room 1', capacity: 1, type: 'spa', status: 'available', lastUsed: '2 hours ago', serviceCategory: 'oil', services: ['Relaxing', 'Slimming', 'Lymphatic'] },
    { id: '2', name: 'Room 2', capacity: 1, type: 'spa', status: 'available', lastUsed: '1 hour ago', serviceCategory: 'oil', services: ['Relaxing', 'Slimming', 'Lymphatic'] },
    { id: '3', name: 'Room 3', capacity: 1, type: 'spa', status: 'available', lastUsed: '45 min ago', serviceCategory: 'oil', services: ['Relaxing', 'Slimming', 'Lymphatic'] },
    { id: '4', name: 'Room 4', capacity: 1, type: 'spa', status: 'available', lastUsed: '30 min ago', serviceCategory: 'oil', services: ['Relaxing', 'Slimming', 'Lymphatic'] },
    { id: '5', name: 'Room 5', capacity: 1, type: 'spa', status: 'available', lastUsed: 'Currently in use', serviceCategory: 'signature', services: ['No.1 Signature'] },
    { id: '6', name: 'Room 6', capacity: 1, type: 'spa', status: 'maintenance', lastUsed: '3 days ago', serviceCategory: 'signature', services: ['No.1 Signature'] },
  ]);

  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showServiceAllocation, setShowServiceAllocation] = useState(false);
  const [selectedRoomForService, setSelectedRoomForService] = useState<Room | null>(null);
  const [newRoom, setNewRoom] = useState<Omit<Room, 'id'>>({
    name: '',
    capacity: 1,
    type: 'spa',
    status: 'available',
    serviceCategory: 'oil',
    services: []
  });

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const scheduleData = await fetchSchedule();
        setSchedule(scheduleData);
      } catch (error) {
        console.error('Failed to load schedule:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, []);

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'occupied': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Room['type']) => {
    switch (type) {
      case 'studio': return <DoorOpen size={16} className="text-purple-500" />;
      case 'gym': return <Building size={16} className="text-blue-500" />;
      case 'pool': return <Users size={16} className="text-cyan-500" />;
      case 'spa': return <Settings size={16} className="text-pink-500" />;
      default: return <Building size={16} className="text-gray-500" />;
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    if (window.confirm('Are you sure you want to delete this room? This will also remove all associated schedule entries.')) {
      setRooms(rooms.filter(room => room.id !== roomId));
      // TODO: Also delete associated schedule entries from API
    }
  };

  const handleSaveRoom = () => {
    if (editingRoom) {
      setRooms(rooms.map(room => room.id === editingRoom.id ? editingRoom : room));
      setEditingRoom(null);
    }
  };

  const handleAddRoom = () => {
    const room: Room = {
      ...newRoom,
      id: Date.now().toString()
    };
    setRooms([...rooms, room]);
    setNewRoom({
      name: '',
      capacity: 10,
      type: 'studio',
      status: 'available'
    });
    setShowAddForm(false);
  };

  const todaySchedule = schedule.filter(day => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return day.day === today;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
          <p className="text-sm text-gray-600">Manage facilities and view daily schedule</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#c5a572] text-white rounded-lg hover:bg-[#b89a5f] transition-colors"
        >
          <Plus size={16} />
          Add Room
        </button>
      </div>

      {/* Add Room Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Room</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
              <input
                type="text"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a572]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a572]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
              <select
                value={newRoom.type}
                onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value as Room['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a572]"
              >
                <option value="studio">Studio</option>
                <option value="gym">Gym</option>
                <option value="pool">Pool</option>
                <option value="spa">Spa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={newRoom.status}
                onChange={(e) => setNewRoom({ ...newRoom, status: e.target.value as Room['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a572]"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddRoom}
              className="px-4 py-2 bg-[#c5a572] text-white rounded-lg hover:bg-[#b89a5f] transition-colors"
            >
              Add Room
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Service Allocation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {serviceAllocations.map((allocation) => (
          <div key={allocation.id} className="bg-gradient-to-br from-[#fcfaf7] to-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${allocation.category === 'oil' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                {allocation.category === 'oil' ? (
                  <Droplets className={allocation.category === 'oil' ? 'text-blue-600' : 'text-purple-600'} size={24} />
                ) : (
                  <Sparkles className={allocation.category === 'oil' ? 'text-blue-600' : 'text-purple-600'} size={24} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{allocation.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{allocation.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allocation.services.map((service) => (
                    <span key={service} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {service}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  Allocated to: <span className="font-semibold text-gray-900">
                    {rooms.filter(r => r.serviceCategory === allocation.category).map(r => r.name).join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-6 relative">
            {/* Delete Button */}
            <button
              onClick={() => handleDeleteRoom(room.id)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete Room"
            >
              <Trash2 size={18} />
            </button>

            {/* Edit Service Button */}
            <button
              onClick={() => {
                setSelectedRoomForService(room);
                setShowServiceAllocation(true);
              }}
              className="absolute top-4 right-10 p-2 text-gray-400 hover:text-[#c5a572] transition-colors"
              title="Allocate Services"
            >
              <Settings size={18} />
            </button>

            <div className="flex items-start gap-4 mb-4">
              {room.serviceCategory === 'oil' ? (
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Droplets size={20} className="text-blue-600" />
                </div>
              ) : (
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles size={20} className="text-purple-600" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{room.name}</h3>
                <p className="text-sm text-gray-600">
                  {room.serviceCategory === 'oil' ? 'Oil-Based Services' : 'No.1 Signature Massage'}
                </p>
              </div>
            </div>

            {/* Services */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">Allocated Services:</p>
              <div className="flex flex-wrap gap-1">
                {room.services && room.services.length > 0 ? (
                  room.services.map((service) => (
                    <span key={service} className="px-2 py-1 bg-white border border-gray-200 text-gray-700 text-xs rounded-full">
                      {service}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No services allocated</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(room.status)}`}>
                  {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Used</span>
                <span className="text-sm text-gray-900">{room.lastUsed}</span>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Clock size={12} />
                Today's Schedule
              </p>
              {loading ? (
                <p className="text-xs text-gray-500">Loading schedule...</p>
              ) : (
                <div className="space-y-1">
                  {todaySchedule.flatMap((day, dayIdx) =>
                    day.classes.map((cls: any, clsIdx: any) => (
                      <div key={`${dayIdx}-${clsIdx}`} className="text-xs text-gray-600">
                        {cls.name} {cls.times[0]?.time && `- ${cls.times[0].time}`}
                      </div>
                    ))
                  )}
                  {todaySchedule.length === 0 && (
                    <p className="text-xs text-gray-500">No classes scheduled today</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Room</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input
                  type="text"
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a572]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={editingRoom.capacity}
                  onChange={(e) => setEditingRoom({ ...editingRoom, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a572]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                <select
                  value={editingRoom.type}
                  onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value as Room['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a572]"
                >
                  <option value="studio">Studio</option>
                  <option value="gym">Gym</option>
                  <option value="pool">Pool</option>
                  <option value="spa">Spa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingRoom.status}
                  onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as Room['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a572]"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveRoom}
                className="flex-1 px-4 py-2 bg-[#c5a572] text-white rounded-lg hover:bg-[#b89a5f] transition-colors"
              >
                <Save size={16} className="inline mr-2" />
                Save Changes
              </button>
              <button
                onClick={() => setEditingRoom(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X size={16} className="inline mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Allocation Modal */}
      {showServiceAllocation && selectedRoomForService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Allocate Services to {selectedRoomForService.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Service Category</label>
                <div className="space-y-2">
                  {serviceAllocations.map((allocation) => (
                    <label key={allocation.id} className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="serviceCategory"
                        value={allocation.category}
                        checked={selectedRoomForService.serviceCategory === allocation.category}
                        onChange={() => {
                          setSelectedRoomForService({
                            ...selectedRoomForService,
                            serviceCategory: allocation.category,
                            services: allocation.services
                          });
                        }}
                        className="mt-1"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{allocation.name}</p>
                        <p className="text-sm text-gray-600">{allocation.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {allocation.services.map((service) => (
                            <span key={service} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setRooms(rooms.map(r => r.id === selectedRoomForService.id ? selectedRoomForService : r));
                  setShowServiceAllocation(false);
                  setSelectedRoomForService(null);
                }}
                className="flex-1 px-4 py-2 bg-[#c5a572] text-white rounded-lg hover:bg-[#b89a5f] transition-colors"
              >
                <Save size={16} className="inline mr-2" />
                Save Allocation
              </button>
              <button
                onClick={() => {
                  setShowServiceAllocation(false);
                  setSelectedRoomForService(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X size={16} className="inline mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;