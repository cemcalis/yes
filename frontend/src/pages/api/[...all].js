export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

// Backend proxy disabled in this build-friendly frontend.
// The frontend expects the backend to run separately at http://localhost:5000
export default function handler(req, res) {
  res.status(502).json({
    error: 'Backend proxy disabled. Run backend separately at http://localhost:5000',
  });
}
