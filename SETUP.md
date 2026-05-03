# CAKTOS MAKEUP ERP — GUIA DE SETUP COMPLETO
**BARATO WEB LTDA.**

---

## 1. PRÉ-REQUISITOS

- Node.js 18+
- npm ou yarn
- Conta no [Supabase](https://supabase.com) (plano gratuito funciona para começar)
- Conta no [Vercel](https://vercel.com) (deploy gratuito)
- Git instalado

---

## 2. SUPABASE — CONFIGURAÇÃO DO BANCO

### 2.1 Criar o projeto
1. Acesse https://supabase.com e crie uma conta
2. Clique em **"New Project"**
3. Defina:
   - Nome: `caktos-erp`
   - Senha do banco: (guarde esta senha)
   - Região: `South America (São Paulo)` — menor latência para o Brasil
4. Aguarde o projeto ser criado (~2 minutos)

### 2.2 Executar o schema SQL
1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **"New query"**
3. Cole todo o conteúdo do arquivo `database/schema.sql`
4. Clique em **"Run"**
5. Verifique se aparece "Success" sem erros

### 2.3 Criar os buckets de Storage
No painel do Supabase, vá em **Storage** e crie os seguintes buckets:

| Bucket      | Público? | Descrição                    |
|-------------|----------|------------------------------|
| `products`  | ✅ Sim   | Imagens dos produtos         |
| `categories`| ✅ Sim   | Imagens das categorias       |
| `suppliers` | ✅ Sim   | Fotos dos fornecedores       |
| `avatars`   | ✅ Sim   | Avatares dos usuários        |
| `documents` | ❌ Não   | Documentos internos (privado)|

**Para cada bucket público, adicione esta policy:**
```sql
-- Permitir upload autenticado
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'NOME_DO_BUCKET');

-- Permitir visualização pública
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'NOME_DO_BUCKET');
```

**Para o bucket `documents` (privado):**
```sql
CREATE POLICY "Allow authenticated access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'documents');
```

### 2.4 Configurar autenticação
1. No Supabase, vá em **Authentication → Settings**
2. Em **Email**, deixe habilitado "Enable Email Signup"
3. Em **Site URL**, coloque `http://localhost:3000` (depois mude para o domínio em produção)
4. Desabilite "Confirm email" para facilitar o desenvolvimento inicial (reabilite em produção)

### 2.5 Criar o usuário administrador
1. Vá em **Authentication → Users**
2. Clique em **"Add user"**
3. Preencha o email e senha da administradora
4. O trigger automático vai criar o perfil com role `admin`

### 2.6 Pegar as credenciais
1. Vá em **Settings → API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha esta chave no front-end)

---

## 3. INSTALAÇÃO LOCAL

```bash
# 1. Clone ou extraia o projeto
cd caktos-erp

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite o .env.local com suas credenciais do Supabase

# 4. Inicie o servidor de desenvolvimento
npm run dev

# 5. Acesse http://localhost:3000
```

### Conteúdo do .env.local
```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. DEPLOY NA VERCEL

### 4.1 Subir o código para o GitHub
```bash
git init
git add .
git commit -m "feat: initial ERP setup"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/caktos-erp.git
git push -u origin main
```

### 4.2 Deploy na Vercel
1. Acesse https://vercel.com e faça login com GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório `caktos-erp`
4. Configure as variáveis de ambiente (mesmas do `.env.local`)
5. Clique em **"Deploy"**
6. Aguarde o deploy (~3 minutos)

### 4.3 Configurar domínio personalizado (opcional)
1. Na Vercel, vá em **Settings → Domains**
2. Adicione o seu domínio
3. Configure os DNS conforme instruído
4. Atualize o **Site URL** no Supabase com o domínio real

---

## 5. CONFIGURAÇÃO PÓS-DEPLOY

### 5.1 Atualizar o Site URL no Supabase
1. Supabase → Authentication → Settings
2. **Site URL**: `https://seu-dominio.com`
3. **Redirect URLs**: adicionar `https://seu-dominio.com/dashboard`

### 5.2 Verificar o sistema
Após o deploy, acesse o sistema e confira:
- [ ] Login funciona
- [ ] Dashboard carrega os dados
- [ ] Cadastro de produto (com upload de imagem)
- [ ] Registro de venda (débito automático de estoque)
- [ ] Módulos: Categorias, Fornecedores, Plataformas
- [ ] Caixa: atualização manual de saldo
- [ ] Drive: upload de documento

---

## 6. CONFIGURAÇÕES INICIAIS DO SISTEMA

Após o primeiro acesso, configure:

1. **Imposto (Simples Nacional)**
   - O padrão já está em **4%**
   - Para alterar: no Supabase, edite `stores.tax_rate` via SQL Editor:
     ```sql
     UPDATE stores SET tax_rate = 4.5 WHERE slug = 'caktos-makeup';
     ```
   - *(Futuramente será configurável pela interface de Settings)*

2. **Taxas das plataformas** → Menu **Plataformas**, clique em **Editar** em cada uma

3. **Categorias** → Menu **Categorias**, adicione imagens às 12 categorias padrão

4. **Fornecedores** → Cadastre os fornecedores antes de cadastrar produtos

5. **Produtos** → Cadastre os produtos com estoque inicial via **Novo Produto** e depois **Ajuste de Estoque**

---

## 7. ESTRUTURA DE PASTAS

```
caktos-erp/
├── database/
│   └── schema.sql              # Schema completo do banco
├── src/
│   ├── app/
│   │   ├── (app)/              # Páginas autenticadas
│   │   │   ├── layout.tsx      # Layout com sidebar
│   │   │   ├── dashboard/      # Dashboard principal
│   │   │   ├── produtos/       # Gestão de produtos
│   │   │   ├── categorias/     # Categorias
│   │   │   ├── fornecedores/   # Fornecedores
│   │   │   ├── plataformas/    # Shopee, TikTok, ML
│   │   │   ├── vendas/         # Registro de vendas
│   │   │   ├── reembolsos/     # Gestão de reembolsos
│   │   │   ├── financeiro/     # Movimentações + Contas
│   │   │   ├── caixa/          # Saldos manuais
│   │   │   └── documentos/     # Drive interno
│   │   ├── login/
│   │   │   └── page.tsx        # Página de login
│   │   ├── globals.css         # Estilos globais
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── dashboard/
│   │   │   ├── SalesTrendChart.tsx
│   │   │   ├── TopProductsList.tsx
│   │   │   ├── CashSummary.tsx
│   │   │   └── NotificationsPanel.tsx
│   │   └── products/
│   │       ├── ProductsClient.tsx
│   │       ├── ProductCard.tsx
│   │       ├── ProductModal.tsx
│   │       └── ProductFormModal.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   └── utils.ts
│   ├── middleware.ts
│   └── types/
│       └── index.ts
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 8. AJUSTAR O IMPOSTO PELA INTERFACE (FUTURO)

Atualmente o imposto é alterado diretamente no banco.
Para adicionar uma tela de configurações que permita alterar a alíquota pela interface,
basta criar uma página `/configuracoes` que leia e atualize `stores.tax_rate`.

---

## 9. SUPORTE E MANUTENÇÃO

**Backup automático:** O Supabase faz backups diários automáticos no plano pago.
No plano gratuito, faça backup manual via SQL Editor:
```sql
-- Exportar dados críticos (vendas)
SELECT * FROM sales ORDER BY created_at DESC;
```

**Monitoramento de erros:** Os erros aparecem no console do navegador e no
painel de logs do Supabase (Database → Logs).

**Atualizar dependências:**
```bash
npm update
npm audit fix
```

---

*Sistema desenvolvido para BARATO WEB LTDA. — CAKTOS MAKEUP*
*Stack: Next.js 14 · TypeScript · Tailwind CSS · Supabase*
