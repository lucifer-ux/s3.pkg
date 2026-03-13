import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoanProvider } from './context/LoanContext';
import PhoneInput from './screens/PhoneInput';
import PANScanner from './screens/PANScanner';
import PhotoCapture from './screens/PhotoCapture';
import BureauCheck from './screens/BureauCheck';
import OfferCategories from './screens/OfferCategories';
import OfferDetail from './screens/OfferDetail';
import KYCSetup from './screens/KYCSetup';
import MandateSetup from './screens/MandateSetup';
import LoanSuccess from './screens/LoanSuccess';
import './index.css';

function App() {
  return (
    <LoanProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
          <Routes>
            <Route path="/" element={<PhoneInput />} />
            <Route path="/pan-scan" element={<PANScanner />} />
            <Route path="/photo-capture" element={<PhotoCapture />} />
            <Route path="/bureau-check" element={<BureauCheck />} />
            <Route path="/offers" element={<OfferCategories />} />
            <Route path="/offer-detail/:offerId" element={<OfferDetail />} />
            <Route path="/kyc-setup" element={<KYCSetup />} />
            <Route path="/mandate-setup" element={<MandateSetup />} />
            <Route path="/success" element={<LoanSuccess />} />
          </Routes>
        </div>
      </Router>
    </LoanProvider>
  );
}

export default App;
