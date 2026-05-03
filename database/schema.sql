-- ============================================================
-- CAKTOS MAKEUP ERP - SCHEMA COMPLETO DO BANCO DE DADOS
-- BARATO WEB LTDA.
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'operator', 'financial');
CREATE TYPE supplier_type AS ENUM ('makeup', 'insumo', 'embalagem', 'outro');
CREATE TYPE stock_movement_type AS ENUM ('entrada', 'saida', 'ajuste');
CREATE TYPE transaction_type AS ENUM ('entrada', 'saida');
CREATE TYPE account_status AS ENUM ('pendente', 'pago', 'vencido', 'cancelado');
CREATE TYPE refund_status AS ENUM ('aberto', 'em_analise', 'aprovado', 'rejeitado', 'concluido');
CREATE TYPE refund_responsibility AS ENUM ('plataforma', 'fornecedor', 'loja', 'cliente');
CREATE TYPE document_type AS ENUM ('nota_fiscal', 'comprovante', 'contrato', 'outro');

-- ============================================================
-- STORES (Multi-loja preparado)
-- ============================================================

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 4.00, -- Simples Nacional, configurável
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir loja padrão
INSERT INTO stores (name, company_name, slug, tax_rate) VALUES
('CAKTOS MAKEUP', 'BARATO WEB LTDA.', 'caktos-makeup', 4.00);

-- ============================================================
-- USUÁRIOS / PERFIS (Multi-role preparado)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  full_name VARCHAR(255),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIAS
-- ============================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  image_url TEXT,
  color VARCHAR(7) DEFAULT '#C084FC',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- Categorias padrão de maquiagem
INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Base', 'base', '#F9A8D4', 1 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Batom', 'batom', '#EC4899', 2 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Sombra', 'sombra', '#A855F7', 3 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Blush', 'blush', '#FB7185', 4 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Corretivo', 'corretivo', '#FCD34D', 5 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Contorno', 'contorno', '#D97706', 6 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Iluminador', 'iluminador', '#FEF08A', 7 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Primer', 'primer', '#C4B5FD', 8 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Máscara de Cílio', 'mascara-cilio', '#1E1B4B', 9 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Delineador', 'delineador', '#312E81', 10 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Pó Facial', 'po-facial', '#FDE68A', 11 FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO categories (store_id, name, slug, color, sort_order)
SELECT id, 'Skincare', 'skincare', '#86EFAC', 12 FROM stores WHERE slug = 'caktos-makeup';

-- ============================================================
-- FORNECEDORES
-- ============================================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type supplier_type NOT NULL DEFAULT 'makeup',
  phone VARCHAR(20),
  email VARCHAR(255),
  website TEXT,
  photo_url TEXT,
  payment_term_days INT DEFAULT 30, -- prazo de pagamento em dias
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLATAFORMAS DE VENDA
-- ============================================================

CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#C084FC',
  logo_url TEXT,
  base_commission DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- % base
  fixed_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,       -- taxa fixa R$
  -- Taxas opcionais (toggles)
  has_optional_fees BOOLEAN DEFAULT FALSE,
  optional_fees JSONB DEFAULT '[]', -- [{name, rate, active}]
  -- Frete
  has_variable_shipping BOOLEAN DEFAULT FALSE,
  -- Comissão por categoria
  has_category_commission BOOLEAN DEFAULT FALSE,
  balance DECIMAL(12,2) DEFAULT 0.00, -- saldo manual
  balance_updated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- Inserir plataformas padrão
INSERT INTO platforms (store_id, name, slug, color, base_commission, fixed_fee, has_optional_fees, optional_fees)
SELECT 
  id,
  'Shopee',
  'shopee',
  '#F97316',
  20.00,
  4.00,
  TRUE,
  '[{"id":"acelera","name":"Acelera Dinheiro","rate":2.5,"active":false},{"id":"campanha","name":"Campanha Oficial","rate":2.5,"active":false}]'::jsonb
FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO platforms (store_id, name, slug, color, base_commission, fixed_fee)
SELECT id, 'TikTok Shop', 'tiktok', '#000000', 12.00, 0.00
FROM stores WHERE slug = 'caktos-makeup';

INSERT INTO platforms (store_id, name, slug, color, base_commission, fixed_fee, has_variable_shipping, has_category_commission)
SELECT id, 'Mercado Livre', 'mercadolivre', '#FFE600', 12.00, 0.00, TRUE, TRUE
FROM stores WHERE slug = 'caktos-makeup';

-- ============================================================
-- PRODUTOS
-- ============================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  description TEXT,
  image_url TEXT,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sale_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  min_stock INT DEFAULT 5, -- estoque mínimo configurável
  is_active BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, sku)
);

-- ============================================================
-- PRODUTO x PLATAFORMA (configuração de taxas por produto)
-- ============================================================

CREATE TABLE product_platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  -- Override de taxas específicas por produto (ex: ML por categoria)
  custom_commission DECIMAL(5,2), -- NULL = usa a da plataforma
  -- Taxas opcionais ativas para este produto nesta plataforma
  active_optional_fees TEXT[] DEFAULT '{}', -- ids das taxas opcionais ativas
  sale_price DECIMAL(12,2), -- preço específico nesta plataforma (NULL = usa o do produto)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, platform_id)
);

-- ============================================================
-- MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type stock_movement_type NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(12,2), -- custo unitário na entrada
  reference_id UUID, -- ID da venda ou compra relacionada
  reference_type VARCHAR(50), -- 'sale', 'purchase', 'adjustment', 'refund'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View para estoque atual
CREATE OR REPLACE VIEW current_stock AS
SELECT 
  p.id as product_id,
  p.store_id,
  p.name as product_name,
  p.sku,
  p.min_stock,
  p.image_url,
  p.purchase_price,
  p.sale_price,
  COALESCE(SUM(CASE WHEN sm.type = 'entrada' THEN sm.quantity
                    WHEN sm.type = 'saida' THEN -sm.quantity
                    WHEN sm.type = 'ajuste' THEN sm.quantity
                    ELSE 0 END), 0) AS stock_quantity,
  CASE WHEN COALESCE(SUM(CASE WHEN sm.type = 'entrada' THEN sm.quantity
                              WHEN sm.type = 'saida' THEN -sm.quantity
                              WHEN sm.type = 'ajuste' THEN sm.quantity
                              ELSE 0 END), 0) <= p.min_stock 
       THEN TRUE ELSE FALSE END AS low_stock
FROM products p
LEFT JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.id, p.store_id, p.name, p.sku, p.min_stock, p.image_url, p.purchase_price, p.sale_price;

-- ============================================================
-- VENDAS
-- ============================================================

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id),
  order_code VARCHAR(100), -- código do pedido na plataforma
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  shipping_cost DECIMAL(12,2) DEFAULT 0.00, -- frete (ML)
  discount DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  -- Taxas aplicadas no momento da venda (snapshot)
  commission_rate DECIMAL(5,2) DEFAULT 0.00,
  fixed_fee DECIMAL(10,2) DEFAULT 0.00,
  optional_fees_applied JSONB DEFAULT '[]',
  tax_rate DECIMAL(5,2) DEFAULT 4.00,
  -- Valores calculados
  total_fees DECIMAL(12,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  net_profit DECIMAL(12,2) DEFAULT 0.00,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  purchase_price DECIMAL(12,2) NOT NULL, -- snapshot do preço de compra
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REEMBOLSOS
-- ============================================================

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id),
  product_id UUID REFERENCES products(id),
  reason TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status refund_status NOT NULL DEFAULT 'aberto',
  responsibility refund_responsibility NOT NULL DEFAULT 'loja',
  restock BOOLEAN DEFAULT FALSE, -- repor estoque?
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MOVIMENTAÇÕES FINANCEIRAS
-- ============================================================

CREATE TABLE financial_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type transaction_type NOT NULL,
  color VARCHAR(7) DEFAULT '#C084FC',
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias financeiras padrão
INSERT INTO financial_categories (store_id, name, type, color)
SELECT id, 'Venda', 'entrada', '#22C55E' FROM stores WHERE slug = 'caktos-makeup';
INSERT INTO financial_categories (store_id, name, type, color)
SELECT id, 'Aporte', 'entrada', '#3B82F6' FROM stores WHERE slug = 'caktos-makeup';
INSERT INTO financial_categories (store_id, name, type, color)
SELECT id, 'Devolução Recebida', 'entrada', '#A855F7' FROM stores WHERE slug = 'caktos-makeup';
INSERT INTO financial_categories (store_id, name, type, color)
SELECT id, 'Compra de Estoque', 'saida', '#EF4444' FROM stores WHERE slug = 'caktos-makeup';
INSERT INTO financial_categories (store_id, name, type, color)
SELECT id, 'Taxa de Plataforma', 'saida', '#F97316' FROM stores WHERE slug = 'caktos-makeup';
INSERT INTO financial_categories (store_id, name, type, color)
SELECT id, 'Imposto', 'saida', '#EAB308' FROM stores WHERE slug = 'caktos-makeup';
INSERT INTO financial_categories (store_id, name, type, color)
SELECT id, 'Marketing', 'saida', '#EC4899' FROM stores WHERE slug = 'caktos-makeup';
INSERT INTO financial_categories (store_id, name, type, color)
SELECT id, 'Operacional', 'saida', '#6B7280' FROM stores WHERE slug = 'caktos-makeup';

CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES financial_categories(id),
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference_id UUID, -- sale_id, purchase_id, etc.
  reference_type VARCHAR(50),
  platform_id UUID REFERENCES platforms(id),
  is_confirmed BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTAS A PAGAR
-- ============================================================

CREATE TABLE accounts_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status account_status NOT NULL DEFAULT 'pendente',
  category_id UUID REFERENCES financial_categories(id),
  recurrent BOOLEAN DEFAULT FALSE,
  recurrence_months INT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTAS A RECEBER
-- ============================================================

CREATE TABLE accounts_receivable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  received_at TIMESTAMPTZ,
  status account_status NOT NULL DEFAULT 'pendente',
  sale_id UUID REFERENCES sales(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTOS (Drive Interno)
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type document_type NOT NULL DEFAULT 'outro',
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL, -- caminho no Supabase Storage
  file_size BIGINT,
  mime_type VARCHAR(100),
  -- Referências polimórficas
  reference_id UUID,
  reference_type VARCHAR(50), -- 'financial_transaction', 'sale', 'product', 'accounts_payable'
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALDOS EM PLATAFORMAS (histórico manual)
-- ============================================================

CREATE TABLE platform_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- SALDO EM BANCO (caixa manual)
-- ============================================================

CREATE TABLE bank_balance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(50) NOT NULL, -- 'low_stock', 'overdue_payable', 'due_soon_payable'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_platform ON sales(platform_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_financial_transactions_store ON financial_transactions(store_id);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_accounts_payable_due ON accounts_payable(due_date);
CREATE INDEX idx_accounts_receivable_due ON accounts_receivable(due_date);
CREATE INDEX idx_documents_reference ON documents(reference_id, reference_type);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: pegar store_id do usuário logado
CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID AS $$
  SELECT store_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Função auxiliar: pegar role do usuário logado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas RLS genéricas (usuário acessa apenas dados da sua loja)
CREATE POLICY "store_isolation" ON stores FOR ALL
  USING (id = get_user_store_id());

CREATE POLICY "store_isolation" ON categories FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON suppliers FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON platforms FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON products FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON stock_movements FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON sales FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON refunds FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON financial_transactions FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON financial_categories FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON accounts_payable FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON accounts_receivable FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON documents FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON platform_balances FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "store_isolation" ON bank_balance_history FOR ALL
  USING (store_id = get_user_store_id());

CREATE POLICY "own_notifications" ON notifications FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "own_profile" ON profiles FOR ALL
  USING (id = auth.uid());

-- Políticas para sale_items (via join com sales)
CREATE POLICY "store_isolation_sale_items" ON sale_items FOR ALL
  USING (
    sale_id IN (SELECT id FROM sales WHERE store_id = get_user_store_id())
  );

CREATE POLICY "store_isolation_product_platforms" ON product_platforms FOR ALL
  USING (
    product_id IN (SELECT id FROM products WHERE store_id = get_user_store_id())
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_platforms_updated_at BEFORE UPDATE ON platforms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_payable_updated_at BEFORE UPDATE ON accounts_payable FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_receivable_updated_at BEFORE UPDATE ON accounts_receivable FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT id INTO v_store_id FROM stores WHERE slug = 'caktos-makeup' LIMIT 1;
  
  INSERT INTO profiles (id, store_id, full_name, role)
  VALUES (
    NEW.id,
    v_store_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: atualizar status de contas vencidas
CREATE OR REPLACE FUNCTION update_overdue_accounts()
RETURNS void AS $$
BEGIN
  UPDATE accounts_payable 
  SET status = 'vencido'
  WHERE status = 'pendente' AND due_date < CURRENT_DATE;
  
  UPDATE accounts_receivable 
  SET status = 'vencido'
  WHERE status = 'pendente' AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- Dashboard: vendas do dia
CREATE OR REPLACE VIEW sales_today AS
SELECT 
  s.store_id,
  COUNT(*) as total_orders,
  SUM(s.total) as total_revenue,
  SUM(s.net_profit) as total_profit
FROM sales s
WHERE DATE(s.sale_date) = CURRENT_DATE
GROUP BY s.store_id;

-- Dashboard: vendas da semana
CREATE OR REPLACE VIEW sales_this_week AS
SELECT 
  s.store_id,
  COUNT(*) as total_orders,
  SUM(s.total) as total_revenue,
  SUM(s.net_profit) as total_profit
FROM sales s
WHERE s.sale_date >= DATE_TRUNC('week', CURRENT_TIMESTAMP)
GROUP BY s.store_id;

-- Dashboard: vendas do mês
CREATE OR REPLACE VIEW sales_this_month AS
SELECT 
  s.store_id,
  COUNT(*) as total_orders,
  SUM(s.total) as total_revenue,
  SUM(s.net_profit) as total_profit
FROM sales s
WHERE s.sale_date >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
GROUP BY s.store_id;

-- Produtos mais vendidos
CREATE OR REPLACE VIEW top_products AS
SELECT 
  p.id,
  p.store_id,
  p.name,
  p.image_url,
  p.sale_price,
  COALESCE(SUM(si.quantity), 0) as total_sold,
  COALESCE(SUM(si.subtotal), 0) as total_revenue
FROM products p
LEFT JOIN sale_items si ON si.product_id = p.id
LEFT JOIN sales s ON s.id = si.sale_id AND s.sale_date >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
GROUP BY p.id, p.store_id, p.name, p.image_url, p.sale_price
ORDER BY total_sold DESC;

-- Saúde financeira
CREATE OR REPLACE VIEW financial_health AS
SELECT 
  p.store_id,
  -- Valor em estoque (custo)
  SUM(cs.stock_quantity * p.purchase_price) as stock_cost_value,
  -- Faturamento potencial (preço de venda)
  SUM(cs.stock_quantity * p.sale_price) as stock_sale_value,
  -- Lucro potencial
  SUM(cs.stock_quantity * (p.sale_price - p.purchase_price)) as potential_profit
FROM products p
JOIN current_stock cs ON cs.product_id = p.id
WHERE p.is_active = TRUE
GROUP BY p.store_id;

-- ============================================================
-- STORAGE BUCKETS (executar via Supabase Dashboard ou API)
-- ============================================================

-- Nota: Buckets são criados via Supabase Dashboard ou API, não via SQL puro.
-- Os seguintes buckets devem ser criados:
-- 1. 'products' - público, imagens de produtos
-- 2. 'categories' - público, imagens de categorias
-- 3. 'suppliers' - público, fotos de fornecedores
-- 4. 'documents' - privado, documentos internos
-- 5. 'avatars' - público, avatars de usuários
