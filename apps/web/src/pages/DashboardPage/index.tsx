import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type Tab = 'home' | 'tasks' | 'lists' | 'settings';

interface Task {
  id: string;
  name: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  time?: string;
  completed: boolean;
}

interface Notice {
  id: string;
  title: string;
  preview: string;
  priority: 'high' | 'normal';
  author: string;
  time: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', name: 'Design Review', category: 'Work', priority: 'high', time: 'Due in 2h', completed: false },
    { id: '2', name: 'Yoga Session', category: 'Wellness', priority: 'medium', time: 'Today, 5:00 PM', completed: false },
    { id: '3', name: 'Read for 20 minutes', category: 'Learning', priority: 'low', completed: true },
    { id: '4', name: 'Morning Meditation', category: 'Wellness', priority: 'medium', time: 'Tomorrow', completed: false },
  ]);
  const [notices] = useState<Notice[]>([
    { id: '1', title: 'The Ethereal Core 2.0 is here.', preview: 'Discover a new way to organize your daily flow with advanced tonal layering.', priority: 'high', author: 'Admin', time: '2 days ago' },
  ]);
  const [shoppingLists] = useState<{ [key: string]: ShoppingItem[] }>({
    Groceries: [
      { id: '1', name: 'Milk', quantity: '2L', checked: false },
      { id: '2', name: 'Bread', quantity: '1', checked: false },
      { id: '3', name: 'Eggs', quantity: '12', checked: true },
    ],
    Hardware: [
      { id: '4', name: 'Screws', quantity: '50', checked: false },
    ],
    Pharmacy: [
      { id: '5', name: 'Aspirin', quantity: '1', checked: false },
    ],
  });

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab tasks={tasks} notices={notices} shoppingLists={shoppingLists} />;
      case 'tasks':
        return <TasksTab tasks={tasks} toggleTask={toggleTask} />;
      case 'lists':
        return <ListsTab shoppingLists={shoppingLists} />;
      case 'settings':
        return <SettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between p-4 lg:p-6 lg:pt-8 bg-surface-container-low">
        <div className="flex items-center gap-4">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8bW3bWmimo5zUJVeDyVn91xVkdi-4ZYKjZ9RTO0bK1r-vabAB27Cqx0Jp87rdivF_AZZMRopbNoLxlV1W4hTwVipldJEDXkNKAXFCnjUa_3o_YhN1OlpwwEZ_oCO_DjgolJ63nwiZpWTBITZBzhRK1Gm9ghuBlwLnLVnHMsrzEVsRsCJ-kzOTY8wLUcmpoFzuklkEmCB5P6fN31ZC1_8houiLZc2RfZWlDdvFWPGQZCFamC0oT5RxWTyzOkbcPNd6J3MXYVfXLEY"
            alt="User profile"
            className="w-12 h-12 rounded-full object-cover"
          />
          <h1 className="text-2xl font-headline font-bold text-on-surface">Ethereal</h1>
        </div>
        <button className="p-2 rounded-full hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-on-surface">notifications</span>
        </button>
      </header>

      {/* Content */}
      <main className="p-4 lg:p-6 lg:max-w-6xl lg:mx-auto">{renderContent()}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-6 py-3 shadow-lg border border-outline-variant z-50">
        <div className="flex items-center gap-6">
          {[
            { id: 'home', icon: 'home', label: 'Home' },
            { id: 'tasks', icon: 'checklist', label: 'Tasks' },
            { id: 'lists', icon: 'shopping_cart', label: 'Lists' },
            { id: 'settings', icon: 'settings', label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                activeTab === item.id ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* FAB */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dim transition-colors z-50">
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </div>
  );
}

function HomeTab({
  tasks,
  notices,
  shoppingLists,
}: {
  tasks: Task[];
  notices: Notice[];
  shoppingLists: { [key: string]: ShoppingItem[] };
}) {
  const pendingTasks = tasks.filter((t) => !t.completed);
  const quickStartTask = pendingTasks[0];

  return (
    <div className="space-y-8">
      {/* Focus Today */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-headline text-on-surface">Focus Today</h2>
          <div className="ethereal-blur bg-white px-4 py-2 rounded-full">
            <span className="text-sm font-medium text-primary">{pendingTasks.length} Tasks Pending</span>
          </div>
        </div>

        {/* Quick Start Card */}
        {quickStartTask && (
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4 border border-outline-variant">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-secondary text-xl">bolt</span>
              <span className="text-sm font-medium text-secondary">Quick Start</span>
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-1">{quickStartTask.name}</h3>
            <p className="text-sm text-on-surface-variant mb-3">{quickStartTask.category}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">palette</span>
                <span className="text-sm text-on-surface-variant capitalize">{quickStartTask.priority} Priority</span>
              </div>
              {quickStartTask.time && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                  <span className="text-sm text-on-surface-variant">{quickStartTask.time}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wellness Card */}
        <div className="bg-primary-container rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-xl">self_improvement</span>
                <span className="text-sm font-medium text-primary">Wellness</span>
              </div>
              <h3 className="text-base font-semibold text-on-primary-container mb-1">Yoga Session</h3>
              <p className="text-sm text-on-primary-container opacity-80">30 mins Morning Flow</p>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-primary text-lg">schedule</span>
              <span className="text-sm font-medium text-primary">Today, 5:00 PM</span>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements */}
      <section>
        <h2 className="text-lg font-semibold font-headline text-on-surface mb-4">Announcements</h2>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-outline-variant">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlYQP2RJuSXFeljxVr72KpEqseHSTiMjfYQ_tbNnth3cv4BnJjka1RbsOJk8CkBlGIitnBThy3P56aOIkbtPXpXXAnhNARhavZVS5EfXoMONhTsZAg7gqYU0wOdGvH_BRQm1GBLVr6Pg0NdS000fwVdk4J3sL3D7wdH8oSQ-t3PMZPYLuah_fsbEXckaPO6GeVqYiQtWs2cRx0yS_Nqfntq3ihkYqXkn59wYJVMBNSEOo7A5jepR-Xm-kK6A7-FZYxV8xjrzO1lY8"
            alt="Office morning light"
            className="w-full h-48 object-cover"
          />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-primary bg-primary-container px-2 py-1 rounded">New Update</span>
            </div>
            <h3 className="text-base font-semibold text-on-surface mb-2">{notices[0]?.title}</h3>
            <p className="text-sm text-on-surface-variant">{notices[0]?.preview}</p>
          </div>
        </div>
      </section>

      {/* Shopping Lists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-headline text-on-surface">Shopping Lists</h2>
          <button className="text-sm font-medium text-secondary flex items-center gap-1 hover:opacity-80 transition-opacity">
            Manage
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(shoppingLists).map(([name, items]) => (
            <div
              key={name}
              className="bg-white rounded-xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">local_grocery_store</span>
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface">{name}</h3>
                  <p className="text-sm text-on-surface-variant">{items.length} Items</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TasksTab({ tasks, toggleTask }: { tasks: Task[]; toggleTask: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold font-headline text-on-surface mb-4">All Tasks</h2>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => toggleTask(task.id)}
          className={`bg-white rounded-xl p-4 shadow-sm border border-outline-variant cursor-pointer transition-all hover:shadow-md ${
            task.completed ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                task.completed
                  ? 'bg-primary border-primary'
                  : 'border-outline hover:border-primary'
              }`}
            >
              {task.completed && <span className="material-symbols-outlined text-on-primary text-sm">check</span>}
            </div>
            <div className="flex-1">
              <h3 className={`font-medium text-on-surface ${task.completed ? 'line-through' : ''}`}>
                {task.name}
              </h3>
              <p className="text-sm text-on-surface-variant">{task.category}</p>
            </div>
            {task.time && !task.completed && (
              <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                {task.time}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListsTab({ shoppingLists }: { shoppingLists: { [key: string]: ShoppingItem[] } }) {
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [items, setItems] = useState(shoppingLists);
  const [newItem, setNewItem] = useState('');

  const toggleItem = (listName: string, itemId: string) => {
    setItems((prev) => ({
      ...prev,
      [listName]: prev[listName].map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    }));
  };

  const addItem = (listName: string) => {
    if (!newItem.trim()) return;
    setItems((prev) => ({
      ...prev,
      [listName]: [
        ...prev[listName],
        { id: Date.now().toString(), name: newItem, quantity: '1', checked: false },
      ],
    }));
    setNewItem('');
  };

  if (selectedList) {
    const listItems = items[selectedList] || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setSelectedList(null)} className="p-2 hover:bg-surface-container rounded-lg transition-colors">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h2 className="text-lg font-semibold font-headline text-on-surface">{selectedList}</h2>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add item..."
            className="flex-1 px-4 py-3 bg-surface border border-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => e.key === 'Enter' && addItem(selectedList)}
          />
          <button
            onClick={() => addItem(selectedList)}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-dim transition-colors"
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {listItems.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleItem(selectedList, item.id)}
              className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant cursor-pointer flex items-center gap-4"
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  item.checked ? 'bg-primary border-primary' : 'border-outline'
                }`}
              >
                {item.checked && <span className="material-symbols-outlined text-on-primary text-sm">check</span>}
              </div>
              <span className={`flex-1 ${item.checked ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                {item.name}
              </span>
              <span className="text-sm text-on-surface-variant">{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold font-headline text-on-surface mb-4">Shopping Lists</h2>
      {Object.entries(items).map(([name, listItems]) => (
        <div
          key={name}
          onClick={() => setSelectedList(name)}
          className="bg-white rounded-xl p-5 shadow-sm border border-outline-variant cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">local_grocery_store</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-on-surface">{name}</h3>
              <p className="text-sm text-on-surface-variant">{listItems.length} Items</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold font-headline text-on-surface mb-4">Settings</h2>

      {/* Profile */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
            <span className="text-2xl font-headline font-bold text-primary">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-on-surface">{user?.name || 'User'}</h3>
            <p className="text-sm text-on-surface-variant">{user?.email || 'user@example.com'}</p>
          </div>
        </div>
      </div>

      {/* Household */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
        <h3 className="text-sm font-medium text-on-surface-variant uppercase tracking-wide mb-4">Household</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-on-surface">The Smith Family</p>
            <p className="text-sm text-on-surface-variant">4 members</p>
          </div>
          <button className="text-sm text-primary hover:underline">Manage</button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
        <h3 className="text-sm font-medium text-on-surface-variant uppercase tracking-wide mb-4">Preferences</h3>
        <div className="flex items-center justify-between">
          <span className="text-on-surface">Language</span>
          <span className="text-on-surface-variant">English</span>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-error-container text-on-error-container py-4 rounded-xl font-medium hover:bg-error-dim transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
