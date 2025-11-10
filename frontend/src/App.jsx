
import React, { useState, useEffect } from 'react';
import { Camera, Users, LogOut, Plus, Trash2, Edit2, Save, X, Download, AlertCircle } from 'lucide-react';

const api = {
  async get(path){ const r = await fetch('/api' + path); if(!r.ok) throw r; return r.json(); },
  async post(path, body){ const r = await fetch('/api' + path, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); if(!r.ok) throw r; return r.json(); },
  async put(path, body){ const r = await fetch('/api' + path, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); if(!r.ok) throw r; return r.json(); },
  async del(path){ const r = await fetch('/api' + path, {method:'DELETE'}); if(!r.ok) throw r; return r.json(); }
};

const AccessControlSystem = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [users, setUsers] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ login: '', password: '', role: 'Пользователь' });
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [objectName, setObjectName] = useState('');
  const [editingObjectName, setEditingObjectName] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [newCamera, setNewCamera] = useState({ name: '', ip: '', type: 'Вход', status: 'Отключена' });
  const [editingCamera, setEditingCamera] = useState(null);
  const [showCameraManagement, setShowCameraManagement] = useState(false);

  useEffect(()=>{ loadData(); }, []);

  const loadData = async () => {
    try {
      const us = await api.get('/users');
      setUsers(us);
      const vs = await api.get('/visitors');
      setVisitors(vs || []);
      const obj = await api.get('/object');
      setObjectName(obj?.value || 'Главный офис');
      const cams = await api.get('/cameras');
      setCameras(cams || []);
    } catch (e) {
      console.error('Ошибка загрузки данных', e);
    }
  };

  const saveAll = async () => {
    // users and cameras and object are saved via API actions immediately on change operations
    // visitors are saved individually when added/edited
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitors(prev => prev.map(v => {
        if (!v.exitTime) {
          const duration = Math.floor((Date.now() - new Date(v.entryTime).getTime()) / 1000);
          return { ...v, duration };
        }
        return v;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cameraActive) return;
    const activeCameras = cameras.filter(cam => cam.status === 'Активна');
    if (activeCameras.length === 0) return;
    let cancelled = false;
    const simulateDetection = async () => {
      const delay = Math.random() * 10000 + 5000;
      await new Promise(r => setTimeout(r, delay));
      if (cancelled) return;
      const randomCamera = activeCameras[Math.floor(Math.random() * activeCameras.length)];
      const photoNumber = Math.floor(Math.random() * 10000);
      if (randomCamera.type === 'Вход') {
        const newVisitor = {
          orderNumber: (visitors.length || 0) + 1,
          photo: String.fromCodePoint(0x1F464) + ' ID' + photoNumber,
          entryTime: new Date().toISOString(),
          duration: 0,
          exitTime: null,
          fullName: '',
          document: '',
          purpose: '',
          notes: '',
          operator: currentUser?.login || 'system',
          cameraName: randomCamera.name,
          cameraIP: randomCamera.ip
        };
        // save to server
        await api.post('/visitors', newVisitor);
        const vs = await api.get('/visitors');
        setVisitors(vs);
        setEditingVisitor(vs[vs.length-1]?.id);
      } else if (randomCamera.type === 'Выход') {
        const activeVisitors = visitors.filter(v => !v.exitTime);
        if (activeVisitors.length > 0) {
          const randomVisitor = activeVisitors[Math.floor(Math.random() * activeVisitors.length)];
          randomVisitor.exitTime = new Date().toISOString();
          // update on server: need visitor id - server returns id in stored objects
          if (randomVisitor.id) {
            await api.put('/visitors/' + randomVisitor.id, randomVisitor);
            const vs = await api.get('/visitors');
            setVisitors(vs);
          }
        }
      }
      simulateDetection();
    };
    simulateDetection();
    return ()=>{ cancelled = true; };
  }, [cameraActive, visitors.length, currentUser, cameras]);

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    try {
      const user = await api.post('/login', loginForm);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginForm({ login: '', password: '' });
    } catch (err) {
      alert('Неверный логин или пароль');
    }
  };

  const handleLogout = () => {
    setCameraActive(false);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowUserManagement(false);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  const handleExitCapture = async (visitorId) => {
    const v = visitors.find(x=>x.id===visitorId);
    if (!v) return;
    v.exitTime = new Date().toISOString();
    await api.put('/visitors/' + visitorId, v);
    const vs = await api.get('/visitors');
    setVisitors(vs);
  };

  const saveVisitorData = async (id, data) => {
    const v = visitors.find(x=>x.id===id);
    if (!v) return;
    const updated = { ...v, ...data };
    await api.put('/visitors/' + id, updated);
    const vs = await api.get('/visitors');
    setVisitors(vs);
    setEditingVisitor(null);
  };

  const deleteVisitor = async (id) => {
    if (window.confirm('Удалить запись о посетителе?')) {
      await api.del('/visitors/' + id);
      const vs = await api.get('/visitors');
      setVisitors(vs);
    }
  };

  const addUser = async () => {
    if (newUser.login && newUser.password) {
      await api.post('/users', newUser);
      const us = await api.get('/users');
      setUsers(us);
      setNewUser({ login: '', password: '', role: 'Пользователь' });
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm('Удалить пользователя?')) {
      await api.del('/users/' + id);
      const us = await api.get('/users');
      setUsers(us);
    }
  };

  const saveUser = async (id, data) => {
    await api.put('/users/' + id, data);
    const us = await api.get('/users');
    setUsers(us);
    setEditingUser(null);
  };

  const saveObjectName = async () => {
    setEditingObjectName(false);
    await api.put('/object', { value: objectName });
  };

  const addCamera = async () => {
    if (newCamera.name && newCamera.ip) {
      await api.post('/cameras', newCamera);
      const cams = await api.get('/cameras');
      setCameras(cams);
      setNewCamera({ name: '', ip: '', type: 'Вход', status: 'Отключена' });
    }
  };

  const deleteCamera = async (id) => {
    if (window.confirm('Удалить камеру?')) {
      await api.del('/cameras/' + id);
      const cams = await api.get('/cameras');
      setCameras(cams);
    }
  };

  const saveCamera = async (id, data) => {
    await api.put('/cameras/' + id, data);
    const cams = await api.get('/cameras');
    setCameras(cams);
    setEditingCamera(null);
  };

  const toggleCameraStatus = async (id) => {
    const cam = cameras.find(c=>c.id===id);
    const status = cam.status === 'Активна' ? 'Отключена' : 'Активна';
    await api.put('/cameras/' + id, { ...cam, status });
    const cams = await api.get('/cameras');
    setCameras(cams);
  };

  const exportToCSV = () => {
    const headers = ['№', 'Фото', 'Время входа', 'Время нахождения', 'Время выхода', 'ФИО', 'Документ', 'Оператор'];
    const rows = visitors.map(v => [
      v.orderNumber,
      v.photo,
      new Date(v.entryTime).toLocaleString('ru-RU'),
      formatDuration(v.duration),
      v.exitTime ? new Date(v.exitTime).toLocaleString('ru-RU') : 'Не зафиксирован',
      v.fullName || 'Не указано',
      v.document || 'Не указано',
      v.operator || ''
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => '"' + (cell ?? '') + '"').join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'visitors_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
  };

  const clearAllData = async () => {
    if (window.confirm('ВНИМАНИЕ! Это удалит ВСЕ данные посетителей. Продолжить?')) {
      if (window.confirm('Вы уверены? Это действие нельзя отменить!')) {
        await api.del('/visitors');
        const vs = await api.get('/visitors');
        setVisitors(vs);
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Camera className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Система контроля доступа
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">Боевая версия v1.0</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Логин</label>
              <input
                type="text"
                value={loginForm.login}
                onChange={(e) => setLoginForm(prev => ({ ...prev, login: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Войти в систему
            </button>
          </div>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 font-semibold mb-2">Первый запуск:</p>
            <p className="text-xs text-yellow-700">admin / admin123 - Администратор</p>
            <p className="text-xs text-yellow-700">user / user123 - Пользователь</p>
          </div>
        </div>
      </div>
    );
  }

  const overtimeVisitors = visitors.filter(v => !v.exitTime && v.duration >= 10800).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Camera className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Система контроля доступа</h1>
                {editingObjectName ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={objectName}
                      onChange={(e) => setObjectName(e.target.value)}
                      className="text-sm px-2 py-1 border border-gray-300 rounded"
                      autoFocus
                    />
                    <button onClick={saveObjectName} className="text-green-600 hover:text-green-700">
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-500">{objectName}</p>
                      {currentUser.role === 'Администратор' && (
                        <button onClick={() => setEditingObjectName(true)} className="text-gray-400 hover:text-gray-600">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {overtimeVisitors > 0 && (
                <div className="flex items-center space-x-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">Превышение: {overtimeVisitors}</span>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{currentUser.login}</p>
                <p className="text-xs text-gray-500">{currentUser.role}</p>
              </div>
              {currentUser.role === 'Администратор' && (
                <>
                  <button
                    onClick={() => setShowUserManagement(!showUserManagement)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center space-x-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>Пользователи</span>
                  </button>
                  <button
                    onClick={() => setShowCameraManagement(!showCameraManagement)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center space-x-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Камеры</span>
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Выход</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {showCameraManagement && currentUser.role === 'Администратор' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Управление IP-камерами</h2>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Добавить камеру</h3>
              <div className="grid grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="Название (например: Вход главный)"
                  value={newCamera.name}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
                />
                <input
                  type="text"
                  placeholder="IP адрес (192.168.1.100)"
                  value={newCamera.ip}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, ip: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <select
                  value={newCamera.type}
                  onChange={(e) => setNewCamera(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option>Вход</option>
                  <option>Выход</option>
                </select>
                <button
                  onClick={addCamera}
                  className="bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {cameras.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Камеры не добавлены</p>
                  <p className="text-sm">Добавьте камеры для автоматической фиксации входа и выхода</p>
                </div>
              ) : (
                cameras.map(camera => (
                  <div key={camera.id} className={'flex items-center justify-between p-3 rounded-lg ' + (camera.status === 'Активна' ? 'bg-green-50 border border-green-200' : 'bg-gray-50')}>
                    {editingCamera === camera.id ? (
                      <>
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <input
                            type="text"
                            defaultValue={camera.name}
                            onChange={(e) => camera.tempName = e.target.value}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="text"
                            defaultValue={camera.ip}
                            onChange={(e) => camera.tempIP = e.target.value}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                          <select
                            defaultValue={camera.type}
                            onChange={(e) => camera.tempType = e.target.value}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option>Вход</option>
                            <option>Выход</option>
                          </select>
                        </div>
                        <div className="flex space-x-2 ml-3">
                          <button
                            onClick={() => saveCamera(camera.id, {
                              name: camera.tempName || camera.name,
                              ip: camera.tempIP || camera.ip,
                              type: camera.tempType || camera.type
                            })}
                            className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
# truncated for upload size
