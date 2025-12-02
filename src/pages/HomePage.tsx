import './HomePage.css';

function HomePage() {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome to Legacy</h1>
        <p className="tagline">Protect what matters most</p>
        
        <div className="info-card">
          <h2>Get Started</h2>
          <p>
            Legacy provides comprehensive health insurance and membership services
            tailored to protect you and your loved ones.
          </p>
          
          <div className="quick-links">
            <a href="/reset-password" className="link-button">
              Reset Password
            </a>
            <a href="/kyc" className="link-button">
              Complete KYC
            </a>
          </div>
        </div>
        
        <div className="features">
          <div className="feature">
            <h3>🛡️ Protection</h3>
            <p>Comprehensive coverage for you and your family</p>
          </div>
          <div className="feature">
            <h3>💼 Flexibility</h3>
            <p>Plans tailored to your needs and budget</p>
          </div>
          <div className="feature">
            <h3>🤝 Support</h3>
            <p>24/7 assistance when you need it most</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
