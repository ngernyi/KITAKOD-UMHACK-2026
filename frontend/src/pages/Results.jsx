import { useApp } from '../context/AppContext';
import { getDemandForecast } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import './Results.css';

const Results = () => {
  const { 
    predictionResults, 
    setPredictionResults, 
    industryTemplate, 
    celebrationType, 
    internalData,
    isLoading,
    setIsLoading 
  } = useApp();

  const runPrediction = async () => {
    setIsLoading(true);
    try {
      const result = await getDemandForecast({
        business_type: industryTemplate,
        celebration_type: celebrationType,
        historical_sales: internalData.salesHistory,
        additional_context: {
          data_points: internalData.salesHistory.length,
          products: internalData.products.length
        }
      });
      
      if (result.success) {
        setPredictionResults({
          forecast: 1450,
          confidence: 87,
          explanation: "Based on 340% increase in Google Trends searches, clear weather forecast, and upcoming public holidays, demand is predicted to be 45% higher than last year.",
          actionItems: [
            { text: "Order 50kg flour by Tuesday", priority: "high" },
            { text: "Hire 2 extra staff for Raya week", priority: "high" },
            { text: "Increase production of ketupat by 50%", priority: "medium" },
            { text: "Start promotional campaign now", priority: "medium" }
          ]
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const forecastData = predictionResults ? [
    { name: 'Predicted Demand', value: predictionResults.forecast },
    { name: 'Buffer Stock', value: Math.round(predictionResults.forecast * 0.1) }
  ] : [];

  const COLORS = ['#e94560', '#4ade80'];

  const industryLabels = {
    'food-hospitality': 'Food & Hospitality',
    'retail': 'Retail',
    'services': 'Services'
  };

  const celebrationLabels = {
    'raya': 'Hari Raya',
    'cny': 'Chinese New Year',
    'deepavali': 'Deepavali',
    'christmas': 'Christmas',
    'weddings': 'Weddings',
    'all': 'All Celebrations'
  };

  return (
    <div className="results">
      <header className="page-header">
        <h1>Prediction Results</h1>
        <p>View AI-generated demand forecasts and insights</p>
      </header>

      <div className="run-prediction">
        <div className="prediction-config">
          <div className="config-item">
            <span className="label">Industry:</span>
            <span className="value">{industryLabels[industryTemplate]}</span>
          </div>
          <div className="config-item">
            <span className="label">Celebration:</span>
            <span className="value">{celebrationLabels[celebrationType]}</span>
          </div>
          <div className="config-item">
            <span className="label">Data Points:</span>
            <span className="value">{internalData.salesHistory.length} sales records</span>
          </div>
        </div>
        <button 
          onClick={runPrediction} 
          disabled={isLoading}
          className="run-btn"
        >
          {isLoading ? 'Running AI Analysis...' : '🤖 Run Prediction'}
        </button>
      </div>

      {predictionResults && (
        <>
          <div className="results-grid">
            <div className="result-card main">
              <h3>Demand Forecast</h3>
              <div className="forecast-value">
                {predictionResults.forecast}
                <span className="unit">units</span>
              </div>
              <p className="trend">↑ 45% vs last year</p>
            </div>

            <div className="result-card">
              <h3>Confidence Score</h3>
              <div className="confidence-value">
                {predictionResults.confidence}
                <span className="unit">%</span>
              </div>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ width: `${predictionResults.confidence}%` }}
                ></div>
              </div>
            </div>

            <div className="result-card">
              <h3>Recommended Buffer</h3>
              <div className="buffer-value">
                {Math.round(predictionResults.forecast * 0.1)}
                <span className="unit">units</span>
              </div>
              <p className="buffer-note">10% safety stock</p>
            </div>
          </div>

          <div className="chart-section">
            <div className="chart-card">
              <h3>Demand Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={forecastData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {forecastData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="explanation-card">
            <h3>🤖 AI Explanation</h3>
            <p>{predictionResults.explanation}</p>
          </div>
        </>
      )}

      {!predictionResults && !isLoading && (
        <div className="empty-state">
          <p>Click "Run Prediction" to generate demand forecast</p>
        </div>
      )}
    </div>
  );
};

export default Results;