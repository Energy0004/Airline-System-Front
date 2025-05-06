import { createRouter, createWebHistory } from 'vue-router'
import FlightList from '../components/FlightList.vue'
import FlightDetails from '../components/FlightDetails.vue'
import LoginPage from '../components/LoginPage.vue'
import RegisterPage from '../components/RegisterPage.vue'
import AirportDetails from '../components/AirportDetails.vue'
import FlightBookingPage from '../components/FlightBookingPage.vue'

const routes = [
  { path: '/', name: 'Home', component: FlightList },
  { path: '/flights/:id', name: 'FlightDetails', component: FlightDetails },
  { path: '/login', name: 'LoginPage', component: LoginPage},
  { path: '/register', name: 'RegisterPage', component: RegisterPage},
  { path: '/airport/:id', name: 'AirportDetails', component: AirportDetails},
  { path: '/booking/:id', name: 'FlightBookingPage', component: FlightBookingPage}
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
