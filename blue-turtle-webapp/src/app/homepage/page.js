'use client';
import Link from 'next/link';
import Image from 'next/image';
import AppHeader from '../components/AppHeader';
import '../css/homepagestyle.css';

export default function Homepage() {
  return (
    <div className="forside-body">
      <div className="page-container">
        <AppHeader bannerTitle="Spilleaften" />

        <div className="banner-container">
          <Image
            src="/billeder/banner.jpg"
            alt="Banner"
            className="banner-image"
            width={1600}
            height={600}
            priority
          />
        </div>

        <nav className="nav-bar">
          <ul>
            <li>
              <Link href="albums/hr24">
                <h2>Herning Rocker 24</h2>
              </Link>
            </li>
            <li>
              <Link href="albums/magaluf">
                <h2>Magaluf</h2>
              </Link>
            </li>
            <li>
              <Link href="albums/rub24">
                <h2>Rock under broen</h2>
              </Link>
            </li>
            <li>
              <Link href="albums/rhodos">
                <h2>Rhodes</h2>
              </Link>
            </li>
            <li>
              <Link href="albums/wagrain24">
                <h2>Wagrain</h2>
              </Link>
            </li>
            <li>
              <Link href="albums/kreta">
                <h2>Kreta</h2>
              </Link>
            </li>
            <li>
              <Link href="albums/malta">
                <h2>Malta</h2>
              </Link>
            </li>
            <li>
              <Link href="albums/hr25">
                <h2>Herning Rocker 25</h2>
              </Link>
            </li>
          </ul>
        </nav>

        <main>
          <h1 className="event-title">Spilleaftener</h1>
          <div className="event-grid">
            <div className="event">
              <Link href="albums/sa1">
                <Image
                  src="/billeder/event1.jpg"
                  alt="sa1"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Andreas Kanotur</p>
            </div>
            <div className="event">
              <Link href="albums/sa2">
                <Image
                  src="/billeder/event2.jpg"
                  alt="sa2"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Oliver Poker</p>
            </div>
            <div className="event">
              <Link href="albums/sa3">
                <Image
                  src="/billeder/event3.jpg"
                  alt="sa3"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Schildt Gorillapark</p>
            </div>
            <div className="event">
              <Link href="albums/sa4">
                <Image
                  src="/billeder/event4.jpg"
                  alt="sa4"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Thomas Quiz</p>
            </div>
            <div className="event">
              <Link href="albums/sa5">
                <Image
                  src="/billeder/event5.jpg"
                  alt="sa5"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Bruun Bowling</p>
            </div>
            <div className="event">
              <Link href="albums/sa6">
                <Image
                  src="/billeder/event6.jpg"
                  alt="sa6"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Patrick Pubcrawl</p>
            </div>
            <div className="event">
              <Link href="albums/sa7">
                <Image
                  src="/billeder/event7.jpg"
                  alt="sa7"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Nøhr Poker</p>
            </div>
            <div className="event">
              <Link href="albums/sa8">
                <Image
                  src="/billeder/event8.jpg"
                  alt="sa8"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Goby O-løb</p>
            </div>
          </div>

          <h1 className="event-title">Julefrokoster</h1>
          <div className="event-grid">
            <div className="event">
              <Link href="albums/jf1">
                <Image
                  src="/billeder/jf1.jpg"
                  alt="jf1"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Mads 2022</p>
            </div>
            <div className="event">
              <Link href="albums/jf2">
                <Image
                  src="/billeder/jf2.jpg"
                  alt="jf2"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Schildt 2023</p>
            </div>
            <div className="event">
              <Link href="albums/jf3">
                <Image
                  src="/billeder/jf3.jpg"
                  alt="jf3"
                  width={300}
                  height={200}
                />
              </Link>
              <p>Tonni 2024</p>
            </div>
          </div>
        </main>

        <footer>
          <p>© 2025 Blue Turtle. Alle rettigheder forbeholdes.</p>
        </footer>
      </div>
    </div>
  );
}