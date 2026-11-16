import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { About } from './components/About'
import { Expect } from './components/Expect'
import { Announcement } from './components/Announcement'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#haqqimizda">
        Məzmuna keç
      </a>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Expect />
        <Announcement />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
