import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import './DataInput.css';

const DataInput = () => {
  const { internalData, setInternalData } = useApp();
  const [activeTab, setActiveTab] = useState('sales');
  const [activeTier, setActiveTier] = useState('basic');
  const fileInputRef = useRef(null);

  // Basic tier states
  const [salesEntry, setSalesEntry] = useState({ date: '', item: '', quantity: '', revenue: '' });
  const [expenseEntry, setExpenseEntry] = useState({ date: '', category: '', amount: '' });

  // Intermediate tier states
  const [productEntry, setProductEntry] = useState({ name: '', category: '', cost: '', price: '', supplier: '' });
  const [inventoryEntry, setInventoryEntry] = useState({ item: '', quantity: '', unit: '', reorderLevel: '' });
  const [customerEntry, setCustomerEntry] = useState({ segment: '', visitFreq: '', avgSpend: '' });

  // Advanced tier states
  const [staffEntry, setStaffEntry] = useState({ role: '', count: '', wage: '', hours: '' });
  const [supplierEntry, setSupplierEntry] = useState({ name: '', items: '', leadTime: '', terms: '' });
  const [marketingEntry, setMarketingEntry] = useState({ channel: '', campaign: '', spend: '' });
  const [pricingEntry, setPricingEntry] = useState({ date: '', item: '', oldPrice: '', newPrice: '' });

  // Basic tier handlers
  const addSale = () => {
    if (salesEntry.date && salesEntry.item) {
      setInternalData({
        ...internalData,
        sales: [...internalData.sales, { ...salesEntry, id: Date.now() }]
      });
      setSalesEntry({ date: '', item: '', quantity: '', revenue: '' });
    }
  };

  const addExpense = () => {
    if (expenseEntry.date && expenseEntry.category) {
      setInternalData({
        ...internalData,
        expenses: [...internalData.expenses, { ...expenseEntry, id: Date.now() }]
      });
      setExpenseEntry({ date: '', category: '', amount: '' });
    }
  };

  // Intermediate tier handlers
  const addProduct = () => {
    if (productEntry.name) {
      setInternalData({
        ...internalData,
        products: [...internalData.products, { ...productEntry, id: Date.now() }]
      });
      setProductEntry({ name: '', category: '', cost: '', price: '', supplier: '' });
    }
  };

  const addInventory = () => {
    if (inventoryEntry.item) {
      setInternalData({
        ...internalData,
        inventory: [...internalData.inventory, { ...inventoryEntry, id: Date.now() }]
      });
      setInventoryEntry({ item: '', quantity: '', unit: '', reorderLevel: '' });
    }
  };

  const addCustomer = () => {
    if (customerEntry.segment) {
      setInternalData({
        ...internalData,
        customers: [...internalData.customers, { ...customerEntry, id: Date.now() }]
      });
      setCustomerEntry({ segment: '', visitFreq: '', avgSpend: '' });
    }
  };

  // Advanced tier handlers
  const addStaff = () => {
    if (staffEntry.role) {
      setInternalData({
        ...internalData,
        staff: [...internalData.staff, { ...staffEntry, id: Date.now() }]
      });
      setStaffEntry({ role: '', count: '', wage: '', hours: '' });
    }
  };

  const addSupplier = () => {
    if (supplierEntry.name) {
      setInternalData({
        ...internalData,
        suppliers: [...internalData.suppliers, { ...supplierEntry, id: Date.now() }]
      });
      setSupplierEntry({ name: '', items: '', leadTime: '', terms: '' });
    }
  };

  const addMarketing = () => {
    if (marketingEntry.campaign) {
      setInternalData({
        ...internalData,
        marketing: [...internalData.marketing, { ...marketingEntry, id: Date.now() }]
      });
      setMarketingEntry({ channel: '', campaign: '', spend: '' });
    }
  };

  const addPricing = () => {
    if (pricingEntry.item) {
      setInternalData({
        ...internalData,
        pricingHistory: [...internalData.pricingHistory, { ...pricingEntry, id: Date.now() }]
      });
      setPricingEntry({ date: '', item: '', oldPrice: '', newPrice: '' });
    }
  };

  // CSV Upload
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const data = [];

      // Skip header row, parse data
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length > 1 && row[0]) {
          data.push({ ...row, id: Date.now() + i });
        }
      }

      // Add to appropriate category
      if (type === 'sales') {
        setInternalData({ ...internalData, sales: [...internalData.sales, ...data] });
      } else if (type === 'expenses') {
        setInternalData({ ...internalData, expenses: [...internalData.expenses, ...data] });
      } else if (type === 'products') {
        setInternalData({ ...internalData, products: [...internalData.products, ...data] });
      } else if (type === 'inventory') {
        setInternalData({ ...internalData, inventory: [...internalData.inventory, ...data] });
      }
    };
    reader.readAsText(file);
  };

  const tiers = [
    { key: 'basic', label: 'Basic', data: 'Sales, Expenses', desc: 'Required for basic analysis' },
    { key: 'intermediate', label: 'Intermediate', data: 'Products, Inventory, Customers', desc: 'Unlock more insights' },
    { key: 'advanced', label: 'Advanced', data: 'Staff, Suppliers, Marketing', desc: 'Full AI capabilities' }
  ];

  const basicTabs = [
    { key: 'sales', label: 'Sales', count: internalData.sales.length },
    { key: 'expenses', label: 'Expenses', count: internalData.expenses.length }
  ];

  const intermediateTabs = [
    { key: 'products', label: 'Products', count: internalData.products.length },
    { key: 'inventory', label: 'Inventory', count: internalData.inventory.length },
    { key: 'customers', label: 'Customers', count: internalData.customers.length }
  ];

  const advancedTabs = [
    { key: 'staff', label: 'Staff', count: internalData.staff.length },
    { key: 'suppliers', label: 'Suppliers', count: internalData.suppliers.length },
    { key: 'marketing', label: 'Marketing', count: internalData.marketing.length },
    { key: 'pricing', label: 'Pricing', count: internalData.pricingHistory.length }
  ];

  return (
    <div className="data-input">
      <header className="page-header">
        <h1>Data Input</h1>
        <p>Enter your business data - more data = better insights</p>
      </header>

      {/* Tier Selector */}
      <div className="tier-selector">
        {tiers.map(tier => (
          <button
            key={tier.key}
            className={`tier-btn ${activeTier === tier.key ? 'active' : ''}`}
            onClick={() => setActiveTier(tier.key)}
          >
            <span className="tier-label">{tier.label}</span>
            <span className="tier-data">{tier.data}</span>
            <span className="tier-desc">{tier.desc}</span>
          </button>
        ))}
      </div>

      {/* === BASIC TIER === */}
      {activeTier === 'basic' && (
        <div className="data-content">
          <div className="data-tabs">
            {basicTabs.map(tab => (
              <button
                key={tab.key}
                className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className="tab-count">{tab.count}</span>
              </button>
            ))}
            <button className="tab upload-btn" onClick={() => fileInputRef.current?.click()}>
              📤 Upload CSV
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".csv"
              onChange={(e) => handleFileUpload(e, activeTab === 'sales' ? 'sales' : 'expenses')}
            />
          </div>

          {activeTab === 'sales' && (
            <div className="input-form">
              <h3>Add Sales Record</h3>
              <div className="form-row">
                <input type="date" value={salesEntry.date} onChange={e => setSalesEntry({ ...salesEntry, date: e.target.value })} />
                <input type="text" value={salesEntry.item} onChange={e => setSalesEntry({ ...salesEntry, item: e.target.value })} placeholder="Item name" />
                <input type="number" value={salesEntry.quantity} onChange={e => setSalesEntry({ ...salesEntry, quantity: e.target.value })} placeholder="Qty" />
                <input type="number" value={salesEntry.revenue} onChange={e => setSalesEntry({ ...salesEntry, revenue: e.target.value })} placeholder="RM" />
                <button onClick={addSale} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {internalData.sales.slice().reverse().map(sale => (
                      <tr key={sale.id}><td>{sale.date}</td><td>{sale.item}</td><td>{sale.quantity}</td><td>RM {sale.revenue}</td></tr>
                    ))}
                    {internalData.sales.length === 0 && <tr><td colSpan="4" className="empty">No sales records - add or upload CSV</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="input-form">
              <h3>Add Expense</h3>
              <div className="form-row">
                <input type="date" value={expenseEntry.date} onChange={e => setExpenseEntry({ ...expenseEntry, date: e.target.value })} />
                <select value={expenseEntry.category} onChange={e => setExpenseEntry({ ...expenseEntry, category: e.target.value })}>
                  <option value="">Category</option>
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Restock">Restock</option>
                  <option value="Staff">Staff</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
                <input type="number" value={expenseEntry.amount} onChange={e => setExpenseEntry({ ...expenseEntry, amount: e.target.value })} placeholder="RM" />
                <button onClick={addExpense} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Date</th><th>Category</th><th>Amount</th></tr></thead>
                  <tbody>
                    {internalData.expenses.slice().reverse().map(exp => (
                      <tr key={exp.id}><td>{exp.date}</td><td>{exp.category}</td><td>RM {exp.amount}</td></tr>
                    ))}
                    {internalData.expenses.length === 0 && <tr><td colSpan="3" className="empty">No expenses - add or upload CSV</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === INTERMEDIATE TIER === */}
      {activeTier === 'intermediate' && (
        <div className="data-content">
          <div className="data-tabs">
            {intermediateTabs.map(tab => (
              <button
                key={tab.key}
                className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className="tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          {activeTab === 'products' && (
            <div className="input-form">
              <h3>Add Product</h3>
              <div className="form-row">
                <input type="text" value={productEntry.name} onChange={e => setProductEntry({ ...productEntry, name: e.target.value })} placeholder="Name" />
                <input type="text" value={productEntry.category} onChange={e => setProductEntry({ ...productEntry, category: e.target.value })} placeholder="Category" />
                <input type="number" value={productEntry.cost} onChange={e => setProductEntry({ ...productEntry, cost: e.target.value })} placeholder="Cost" />
                <input type="number" value={productEntry.price} onChange={e => setProductEntry({ ...productEntry, price: e.target.value })} placeholder="Price" />
                <input type="text" value={productEntry.supplier} onChange={e => setProductEntry({ ...productEntry, supplier: e.target.value })} placeholder="Supplier" />
                <button onClick={addProduct} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Name</th><th>Category</th><th>Cost</th><th>Price</th><th>Supplier</th><th>Margin</th></tr></thead>
                  <tbody>
                    {internalData.products.slice().reverse().map(p => {
                      const margin = p.price && p.cost ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
                      return (
                        <tr key={p.id}>
                          <td>{p.name}</td><td>{p.category}</td><td>RM {p.cost}</td><td>RM {p.price}</td><td>{p.supplier}</td><td className={margin >= 30 ? 'positive' : margin < 20 ? 'negative' : ''}>{margin}%</td>
                        </tr>
                      );
                    })}
                    {internalData.products.length === 0 && <tr><td colSpan="6" className="empty">No products yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="input-form">
              <h3>Add Inventory Item</h3>
              <div className="form-row">
                <input type="text" value={inventoryEntry.item} onChange={e => setInventoryEntry({ ...inventoryEntry, item: e.target.value })} placeholder="Item" />
                <input type="number" value={inventoryEntry.quantity} onChange={e => setInventoryEntry({ ...inventoryEntry, quantity: e.target.value })} placeholder="Qty" />
                <input type="text" value={inventoryEntry.unit} onChange={e => setInventoryEntry({ ...inventoryEntry, unit: e.target.value })} placeholder="Unit" />
                <input type="number" value={inventoryEntry.reorderLevel} onChange={e => setInventoryEntry({ ...inventoryEntry, reorderLevel: e.target.value })} placeholder="Reorder@" />
                <button onClick={addInventory} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Reorder At</th><th>Status</th></tr></thead>
                  <tbody>
                    {internalData.inventory.slice().reverse().map(item => {
                      const status = item.quantity <= item.reorderLevel ? 'low' : 'ok';
                      return (
                        <tr key={item.id}>
                          <td>{item.item}</td><td>{item.quantity}</td><td>{item.unit}</td><td>{item.reorderLevel}</td><td className={status === 'low' ? 'negative' : 'positive'}>{status === 'low' ? '⚠️ Low' : '✅ OK'}</td>
                        </tr>
                      );
                    })}
                    {internalData.inventory.length === 0 && <tr><td colSpan="5" className="empty">No inventory yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="input-form">
              <h3>Add Customer Segment</h3>
              <div className="form-row">
                <input type="text" value={customerEntry.segment} onChange={e => setCustomerEntry({ ...customerEntry, segment: e.target.value })} placeholder="Segment (e.g. Regular)" />
                <input type="text" value={customerEntry.visitFreq} onChange={e => setCustomerEntry({ ...customerEntry, visitFreq: e.target.value })} placeholder="Visit Frequency" />
                <input type="number" value={customerEntry.avgSpend} onChange={e => setCustomerEntry({ ...customerEntry, avgSpend: e.target.value })} placeholder="Avg Spend (RM)" />
                <button onClick={addCustomer} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Segment</th><th>Visit Frequency</th><th>Avg Spend</th></tr></thead>
                  <tbody>
                    {internalData.customers.slice().reverse().map(c => (
                      <tr key={c.id}><td>{c.segment}</td><td>{c.visitFreq}</td><td>RM {c.avgSpend}</td></tr>
                    ))}
                    {internalData.customers.length === 0 && <tr><td colSpan="3" className="empty">No customer data yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === ADVANCED TIER === */}
      {activeTier === 'advanced' && (
        <div className="data-content">
          <div className="data-tabs">
            {advancedTabs.map(tab => (
              <button
                key={tab.key}
                className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className="tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          {activeTab === 'staff' && (
            <div className="input-form">
              <h3>Add Staff</h3>
              <div className="form-row">
                <input type="text" value={staffEntry.role} onChange={e => setStaffEntry({ ...staffEntry, role: e.target.value })} placeholder="Role (e.g. Cashier)" />
                <input type="number" value={staffEntry.count} onChange={e => setStaffEntry({ ...staffEntry, count: e.target.value })} placeholder="Count" />
                <input type="number" value={staffEntry.wage} onChange={e => setStaffEntry({ ...staffEntry, wage: e.target.value })} placeholder="Monthly Wage (RM)" />
                <input type="number" value={staffEntry.hours} onChange={e => setStaffEntry({ ...staffEntry, hours: e.target.value })} placeholder="Hours/Day" />
                <button onClick={addStaff} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Role</th><th>Count</th><th>Wage</th><th>Hours/Day</th><th>Monthly Cost</th></tr></thead>
                  <tbody>
                    {internalData.staff.slice().reverse().map(s => (
                      <tr key={s.id}><td>{s.role}</td><td>{s.count}</td><td>RM {s.wage}</td><td>{s.hours}</td><td>RM {s.count * s.wage}</td></tr>
                    ))}
                    {internalData.staff.length === 0 && <tr><td colSpan="5" className="empty">No staff yet - Required for AI What-if</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="input-form">
              <h3>Add Supplier</h3>
              <div className="form-row">
                <input type="text" value={supplierEntry.name} onChange={e => setSupplierEntry({ ...supplierEntry, name: e.target.value })} placeholder="Supplier Name" />
                <input type="text" value={supplierEntry.items} onChange={e => setSupplierEntry({ ...supplierEntry, items: e.target.value })} placeholder="Items" />
                <input type="number" value={supplierEntry.leadTime} onChange={e => setSupplierEntry({ ...supplierEntry, leadTime: e.target.value })} placeholder="Lead Time (days)" />
                <input type="text" value={supplierEntry.terms} onChange={e => setSupplierEntry({ ...supplierEntry, terms: e.target.value })} placeholder="Terms (e.g. Net 30)" />
                <button onClick={addSupplier} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Name</th><th>Items</th><th>Lead Time</th><th>Terms</th></tr></thead>
                  <tbody>
                    {internalData.suppliers.slice().reverse().map(s => (
                      <tr key={s.id}><td>{s.name}</td><td>{s.items}</td><td>{s.leadTime} days</td><td>{s.terms}</td></tr>
                    ))}
                    {internalData.suppliers.length === 0 && <tr><td colSpan="4" className="empty">No suppliers yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="input-form">
              <h3>Add Marketing Campaign</h3>
              <div className="form-row">
                <select value={marketingEntry.channel} onChange={e => setMarketingEntry({ ...marketingEntry, channel: e.target.value })}>
                  <option value="">Channel</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="SMS">SMS</option>
                  <option value="Flyers">Flyers</option>
                </select>
                <input type="text" value={marketingEntry.campaign} onChange={e => setMarketingEntry({ ...marketingEntry, campaign: e.target.value })} placeholder="Campaign Name" />
                <input type="number" value={marketingEntry.spend} onChange={e => setMarketingEntry({ ...marketingEntry, spend: e.target.value })} placeholder="Spend (RM)" />
                <button onClick={addMarketing} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Channel</th><th>Campaign</th><th>Spend</th></tr></thead>
                  <tbody>
                    {internalData.marketing.slice().reverse().map(m => (
                      <tr key={m.id}><td>{m.channel}</td><td>{m.campaign}</td><td>RM {m.spend}</td></tr>
                    ))}
                    {internalData.marketing.length === 0 && <tr><td colSpan="3" className="empty">No marketing campaigns yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="input-form">
              <h3>Add Pricing History</h3>
              <div className="form-row">
                <input type="date" value={pricingEntry.date} onChange={e => setPricingEntry({ ...pricingEntry, date: e.target.value })} />
                <input type="text" value={pricingEntry.item} onChange={e => setPricingEntry({ ...pricingEntry, item: e.target.value })} placeholder="Item" />
                <input type="number" value={pricingEntry.oldPrice} onChange={e => setPricingEntry({ ...pricingEntry, oldPrice: e.target.value })} placeholder="Old Price" />
                <input type="number" value={pricingEntry.newPrice} onChange={e => setPricingEntry({ ...pricingEntry, newPrice: e.target.value })} placeholder="New Price" />
                <button onClick={addPricing} className="add-btn">Add</button>
              </div>
              <div className="data-table">
                <table>
                  <thead><tr><th>Date</th><th>Item</th><th>Old Price</th><th>New Price</th><th>Change</th></tr></thead>
                  <tbody>
                    {internalData.pricingHistory.slice().reverse().map(p => {
                      const change = p.oldPrice && p.newPrice ? Math.round(((p.newPrice - p.oldPrice) / p.oldPrice) * 100) : 0;
                      return (
                        <tr key={p.id}>
                          <td>{p.date}</td><td>{p.item}</td><td>RM {p.oldPrice}</td><td>RM {p.newPrice}</td><td className={change > 0 ? 'positive' : change < 0 ? 'negative' : ''}>{change > 0 ? '+' : ''}{change}%</td>
                        </tr>
                      );
                    })}
                    {internalData.pricingHistory.length === 0 && <tr><td colSpan="5" className="empty">No pricing history yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Footer */}
      <div className="data-summary">
        <h3>📊 Data Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">Sales Records</span>
            <span className="value">{internalData.sales.length}</span>
          </div>
          <div className="summary-item">
            <span className="label">Expenses</span>
            <span className="value">{internalData.expenses.length}</span>
          </div>
          <div className="summary-item">
            <span className="label">Products</span>
            <span className="value">{internalData.products.length}</span>
          </div>
          <div className="summary-item">
            <span className="label">Inventory</span>
            <span className="value">{internalData.inventory.length}</span>
          </div>
          <div className="summary-item">
            <span className="label">Customers</span>
            <span className="value">{internalData.customers.length}</span>
          </div>
          <div className="summary-item">
            <span className="label">Staff</span>
            <span className="value">{internalData.staff.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataInput;