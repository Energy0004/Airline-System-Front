<script>
  import axios from 'axios';
  import { jwtDecode } from 'jwt-decode';
  import { format } from 'date-fns';
  
  export default {
    name: 'Profile',
    data() {
        return {
            isAdmin: false,
            user: { username: '', email: '', password: '' },
            bookings: [],
            users: [],
            selectedUser: null,
            userBookings: [],
            newUser: { username: '', email: '', password: '', isAdmin: false },
            passwordForm: { new_password: '', confirm_password: '' }, 
            showModal: false,
            updateUserErrors: null,            // <- ошибки профиля
            updatePasswordErrors: null,        // <- ошибки пароля
            passwordChangedSuccess: false,

        };
    },
    mounted() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
                const decoded = jwtDecode(token);
                // console.log(decoded)
                this.isAdmin = decoded.isAdmin || false;

                this.user.username = decoded.username || '';
                this.user.email = decoded.email || '';
            } catch (e) {
                console.error('Invalid token:', e);
            }
        }

        this.fetchUserData();
        if (this.isAdmin) {
            this.fetchAllUsers();
        }
    },
    computed: {
        isLoggedIn() {
            const token = localStorage.getItem('auth_token');
            if (!token) return false;
                try {
                    const decoded = jwtDecode(token);
                    if (!decoded || !decoded.exp) return false;
                    const now = Date.now() / 1000;
                    return decoded.exp > now;
                } catch (e) {
                    console.error('Invalid token:', e);
                return false;
            }
        }
    },
    methods: {
        formatDate(dateString) {
            const date = new Date(dateString);
            return format(date, 'MMMM d, yyyy h:mm a'); // May 7, 2025 12:09 AM
        },
      fetchUserData() {
        axios.get('http://127.0.0.1:8000/api/my_bookings/')
          .then(response => {
            this.bookings = response.data;
          })
          .catch(error => {
            console.error('Error fetching bookings:', error);
          });
      },
      updateUser() {
        this.updateUserErrors = null; // сбрасываем ошибки
        const token = localStorage.getItem('auth_token');
        axios.put('http://127.0.0.1:8000/api/users/update/me/', {
          username: this.user.username,
          email: this.user.email
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(() => {
          alert('Profile updated successfully');
        })
        .catch(error => {
          if (error.response && error.response.data) {
            this.updateUserErrors = Object.values(error.response.data).flat();
          } else {
            this.updateUserErrors = ['Unexpected error occurred'];
          }
        });
      },
      updatePassword() {
        this.updatePasswordErrors = null;
        const token = localStorage.getItem('auth_token');
        axios.put('http://127.0.0.1:8000/api/users/change-password/', {
          new_password: this.passwordForm.new_password,
          confirm_password: this.passwordForm.confirm_password
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(() => {
          this.passwordChangedSuccess = true;
          this.passwordForm.new_password = '';
          this.passwordForm.confirm_password = '';

          this.passwordChangedSuccess = true;
          setTimeout(() => { this.passwordChangedSuccess = false }, 3000);
        })
        .catch(error => {
          if (error.response && error.response.data) {
            this.updatePasswordErrors = Object.values(error.response.data).flat();
          } else {
            this.updatePasswordErrors = ['Unexpected error occurred'];
          }
        });
      },
      deleteUser() {
        const token = localStorage.getItem("auth_token");

        axios.delete('http://127.0.0.1:8000/api/users/me/', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(() => {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
            window.location.href = '/login';
          })
          .catch(error => {
            console.error('Error deleting account:', error);
            alert('Failed to delete account.');
          });

        this.showModal = false;
      },
      fetchAllUsers() {
        axios.get('http://127.0.0.1:8000/api/users')
          .then(response => {
            this.users = response.data;
          })
          .catch(error => {
            console.error('Error fetching users:', error);
          });
      },
      selectUserForEdit(user) {
        this.selectedUser = { ...user };
      },
      updateSelectedUser() {
        axios.put(`http://127.0.0.1:8000/api/users/${this.selectedUser.id}`, this.selectedUser)
          .then(() => {
            alert('User updated successfully');
            this.fetchAllUsers();
            this.selectedUser = null;
          })
          .catch(error => {
            console.error('Error updating user:', error);
          });
      },
      deleteSelectedUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
          axios.delete(`http://127.0.0.1:8000/api/users/${userId}`)
            .then(() => {
              alert('User deleted successfully');
              this.fetchAllUsers();
            })
            .catch(error => {
              console.error('Error deleting user:', error);
            });
        }
      },
      createUser() {
        axios.post('http://127.0.0.1:8000/api/users', this.newUser)
          .then(() => {
            alert('User created successfully');
            this.fetchAllUsers();
            this.newUser = { username: '', email: '', password: '', isAdmin: false };
          })
          .catch(error => {
            console.error('Error creating user:', error);
          });
      },
      getBookingsForUser(userId) {
        axios.get(`http://127.0.0.1:8000/api/bookings/user/${userId}`)
          .then(response => {
            this.userBookings = response.data;
            this.selectedUser = this.users.find(u => u.id === userId);
          })
          .catch(error => {
            console.error('Error fetching user bookings:', error);
          });
      }
    }
  };
  </script>

<template>
  <div class="container">
    <div class="content-card">
      <h1>👤 Profile</h1>

      <!-- Unauthenticated User -->
      <div v-if="!isLoggedIn" class="error-msg">
        ❌ You need to log in to view this page. <router-link to="/login">Login here</router-link>.
      </div>

      <!-- Authenticated User -->
      <div v-else-if="isLoggedIn">
        <!-- Non-Admin Section -->
        <div v-if="!isAdmin">
          <h2>✏️ Your Information</h2>

          <!-- Показываем ошибки -->
          <p v-if="updateUserErrors" class="error-message">
            <span v-for="(msg, index) in updateUserErrors" :key="index">{{ msg }}<br /></span>
          </p>

          <form @submit.prevent="updateUser" class="user-form">
            <label>
              Username:
              <input v-model="user.username" required placeholder="Enter username" />
            </label>
            <label>
              Email:
              <input v-model="user.email" type="email" required placeholder="Enter email" />
            </label>
            <button type="submit" class="btn submit-btn">Update Profile</button>
          </form>

          <hr>

          <h2>🔑 Change Password</h2>

          <p v-if="updatePasswordErrors" class="error-message">
            <span v-for="(msg, index) in updatePasswordErrors" :key="index">{{ msg }}<br /></span>
          </p>

          <form @submit.prevent="updatePassword" class="password-form">
            <label>
              New Password:
              <input v-model="passwordForm.new_password" type="password" required placeholder="Enter new password" />
            </label>
            <label>
              Confirm Password:
              <input v-model="passwordForm.confirm_password" type="password" required placeholder="Confirm new password" />
            </label>
            <button type="submit" class="btn submit-btn">Change Password</button>
          </form>

          <!-- Delete button -->
          <button @click="showModal = true" class="btn btn-danger">🗑️ Delete Account</button>

          <!-- Success Popup -->
          <div v-if="passwordChangedSuccess" class="popup-overlay">
          <div class="popup-content">
              <h3>✅ Password Changed Successfully!</h3>
              <button @click="passwordChangedSuccess = false">Close</button>
            </div>
          </div>

          <!-- Modal -->
          <div v-if="showModal" class="modal-overlay">
            <div class="modal-box">
              <h2 class="modal-title">⚠️ Confirm Deletion</h2>
              <p class="modal-message">
                Are you sure you want to delete your account? <br />
                <strong>This action cannot be undone.</strong>
              </p>
              <div class="modal-buttons">
                <button @click="deleteUser" class="btn-confirm">Yes, Delete</button>
                <button @click="showModal = false" class="btn-cancel">Cancel</button>
              </div>
            </div>
          </div>

          <h2>🛫 Your Bookings</h2>
          <div v-if="bookings.length" class="bookings-list">
            <table>
              <thead>
                <tr>
                  <th>Booking Code</th>
                  <th>Flight</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="booking in bookings" :key="booking.id">
                  <td>{{ booking.booking_code }}</td>
                  <td>{{ booking.flight.origin.code }} → {{ booking.flight.destination.code }}</td>
                  <td>{{ formatDate(booking.created_at) }}</td>
                  <td>
                    <router-link :to="{ name: 'FlightDetails', params: { id: booking.flight.id } }" class="btn btn-info">View Flight</router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else>No bookings found.</p>
        </div>

        <!-- Admin Section -->
        <div v-else>
          <h2>👥 Manage Users</h2>
          <div class="users-list">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>{{ user.username }}</td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.isAdmin ? 'Admin' : 'User' }}</td>
                  <td>
                    <button @click="selectUserForEdit(user)" class="btn btn-primary">Edit</button>
                    <button @click="deleteSelectedUser(user.id)" class="btn btn-danger">Delete</button>
                    <button @click="getBookingsForUser(user.id)" class="btn btn-info">View Bookings</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 v-if="selectedUser">✏️ Edit User: {{ selectedUser.username }}</h3>
          <form v-if="selectedUser" @submit.prevent="updateSelectedUser" class="user-form">
            <label>
              Username:
              <input v-model="selectedUser.username" required placeholder="Enter username" />
            </label>
            <label>
              Email:
              <input v-model="selectedUser.email" type="email" required placeholder="Enter email" />
            </label>
            <label>
              Password:
              <input v-model="selectedUser.password" type="password" placeholder="Enter new password" />
            </label>
            <label>
              Admin Role:
              <input type="checkbox" v-model="selectedUser.isAdmin" />
            </label>
            <button type="submit" class="btn submit-btn">Update User</button>
          </form>

          <h3>➕ Create New User</h3>
          <form @submit.prevent="createUser" class="user-form">
            <label>
              Username:
              <input v-model="newUser.username" required placeholder="Enter username" />
            </label>
            <label>
              Email:
              <input v-model="newUser.email" type="email" required placeholder="Enter email" />
            </label>
            <label>
              Password:
              <input v-model="newUser.password" type="password" required placeholder="Enter password" />
            </label>
            <label>
              Admin Role:
              <input type="checkbox" v-model="newUser.isAdmin" />
            </label>
            <button type="submit" class="btn submit-btn">Create User</button>
          </form>

          <h2 v-if="userBookings.length && selectedUser">🛫 Bookings for {{ selectedUser.username }}</h2>
          <div v-if="userBookings.length" class="bookings-list">
            <table>
              <thead>
                <tr>
                  <th>Flight</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="booking in userBookings" :key="booking.id">
                  <td>{{ booking.flight.origin.code }} → {{ booking.flight.destination.code }}</td>
                  <td>{{ booking.date }}</td>
                  <td>
                    <router-link :to="`/flight/${booking.flight.id}`" class="btn btn-info">View Flight</router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else-if="selectedUser">No bookings found for {{ selectedUser.username }}.</p>
        </div>
      </div>
    </div>
  </div>
  </template>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.popup-content {
  background: white;
  padding: 20px 30px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.popup-content h3 {
  margin-bottom: 15px;
}

.popup-content button {
  background: #4CAF50;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.popup-content button:hover {
  background: #45a049;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.content-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 30px;
  margin-bottom: 20px;
}

h1 {
  font-size: 28px;
  color: var(--dark);
  text-align: center;
  margin-bottom: 24px;
}

h2 {
  font-size: 22px;
  color: var(--primary);
  margin: 20px 0 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--gray);
}

h3 {
  font-size: 20px;
  color: var(--primary);
  margin: 15px 0 10px;
}

.user-form, .password-form {
  background-color: var(--gray-light);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--primary);
  position: relative;
}

.user-form label, .password-form label {
  display: block;
  margin-bottom: 15px;
  font-weight: 600;
  color: var(--dark);
}

.user-form input, .password-form input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--gray);
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.user-form input:focus, .password-form input:focus {
  border-color: var(--primary);
  outline: none;
}

.user-form::before {
  content: '👤';
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 20px;
}

.user-form label {
  padding-left: 40px;
}

.password-form::before {
  content: '🔒';
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 20px;
}

.password-form label {
  padding-left: 40px;
}

.bookings-list, .users-list {
  margin-top: 20px;
  background-color: var(--gray-light);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--primary);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  padding: 12px 15px;
  text-align: center;
  border-bottom: 1px solid var(--gray);
  vertical-align: middle;
}

th {
  background-color: var(--primary);
  color: white;
  font-weight: 600;
}

tr:hover {
  background-color: #e6f0ff;
}

.btn {
  display: inline-block;
  padding: 8px 15px;
  border-radius: 6px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.btn:hover {
  transform: scale(1.02);
}

.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
}

.btn-danger {
  background-color: var(--danger);
  color: white;
  margin: 15px 0;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-info:hover {
  background-color: #138496;
}

.submit-btn {
  width: 100%;
  padding: 12px 20px;
  font-size: 16px;
  background-color: var(--primary);
  color: white;
  border-radius: 6px;
  margin-top: 15px;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.submit-btn:hover {
  background-color: var(--primary-dark);
  transform: scale(1.02);
}

.error-message {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 14px;
}

.error-msg {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  font-size: 16px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(30, 30, 30, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-box {
  background: #fff;
  padding: 40px;
  border-radius: 16px;
  border: 1px solid var(--primary);
  width: 90%;
  max-width: 420px;
  text-align: center;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.modal-title {
  font-size: 1.8rem;
  margin-bottom: 15px;
  color: var(--primary);
}

.modal-message {
  font-size: 1rem;
  color: #555;
  margin-bottom: 30px;
}

.modal-buttons {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.btn-confirm {
  flex: 1;
  background: #e74c3c;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;
}

.btn-confirm:hover {
  background: #c0392b;
  transform: scale(1.02);
}

.btn-cancel {
  flex: 1;
  background: #95a5a6;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;
}

.btn-cancel:hover {
  background: #7f8c8d;
  transform: scale(1.02);
}
</style>