'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiEye, HiBan } from 'react-icons/hi';

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const router = useRouter();

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        router.push('/admin/giris');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
        router.push('/admin/giris');
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
  };

  const banUser = async (userId: number) => {
    if (!confirm('Bu kullanıcıyı yasaklamak istediğinize emin misiniz?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ banned: true }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-posta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewUserDetails(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <HiEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => banUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <HiBan className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Kullanıcı Detayları</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Ad Soyad</p>
                <p className="font-medium">{selectedUser.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">E-posta</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Kayıt Tarihi</p>
                <p className="font-medium">
                  {new Date(selectedUser.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Kullanıcı ID</p>
                <p className="font-medium">#{selectedUser.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
