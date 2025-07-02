# app.py

import os
from flask import Flask, request, jsonify, session, redirect, url_for, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta, UTC
import json
import secrets

app = Flask(__name__)

# --- CONFIGURAÇÃO DO CORS (AGORA MANUAL VIA after_request) ---
@app.after_request
def add_cors_headers(response):
    # Permite requisições de qualquer origem para o deploy inicial.
    # Em produção, você deve restringir isso ao domínio do seu frontend.
    # Exemplo: 'https://seu-frontend-pensao.onrender.com'
    response.headers.add('Access-Control-Allow-Origin', '*')
    # Permite que o navegador envie cookies de sessão (para manter o login)
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    # Permite cabeçalhos comuns que o navegador pode enviar
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    # Permite os métodos HTTP que o frontend usará
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


# --- CONFIGURAÇÕES DA APLICAÇÃO ---
app.config['SECRET_KEY'] = 'meu_abacate'
# Use DATABASE_URL do Render para PostgreSQL, ou fallback para um valor padrão
# O Render irá injetar a URL do seu banco de dados PostgreSQL aqui.
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

db = SQLAlchemy(app)

# --- MODELOS DO BANCO DE DADOS ---

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    surname = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    children = db.relationship('Child', backref='user', lazy=True, cascade="all, delete-orphan")
    reset_tokens = db.relationship('PasswordResetToken', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = password

    def check_password(self, password):
        return self.password_hash == password

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'surname': self.surname,
            'email': self.email
        }

class Child(db.Model):
    __tablename__ = 'children'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    gender = db.Column(db.String(50), nullable=True)
    date_of_birth = db.Column(db.Date, nullable=False)
    monthly_alimony_value = db.Column(db.Float, nullable=False)
    enabled_years = db.Column(db.JSON, nullable=True)
    payments = db.relationship('Payment', backref='child', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'gender': self.gender,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'monthly_alimony_value': self.monthly_alimony_value,
            'enabled_years': self.enabled_years
        }

class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey('children.id'), nullable=False)
    value_paid = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    month_reference = db.Column(db.Integer, nullable=True)
    year_reference = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))

    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'amount': self.value_paid,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'month_reference': self.month_reference,
            'year_reference': self.year_reference,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'token': self.token,
            'expires_at': self.expires_at.isoformat(),
            'used': self.used,
            'created_at': self.created_at.isoformat()
        }

# Comentado para deploy em produção, pois o banco de dados já foi populado
# with app.app_context():
#     db.create_all()

# --- HELPERS DE AUTENTICAÇÃO ---
def login_required(f):
    def wrapper(*args, **kwargs):
        if session.get('user_id') is None:
            print("Login Required: No user_id in session")
            return jsonify({'message': 'Não autorizado', 'redirect': 'index.html'}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# --- ROTAS PARA SERVIR FICHEIROS ESTÁTICOS DO FRONTEND ---
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Rota para servir ficheiros estáticos do frontend
@app.route('/<path:path>')
def serve_static_files(path):
    # Tenta servir o ficheiro diretamente da raiz do projeto
    # Isso é útil para HTML, CSS, JS e outros ativos na raiz
    try:
        return send_from_directory('.', path)
    except Exception:
        # Se não encontrar na raiz, tenta servir de uma pasta 'icons'
        # Assumindo que os ícones estão numa subpasta 'icons'
        if path.startswith('icons/'):
            icon_name = path.split('/')[-1]
            return send_from_directory('icons', icon_name)
        # Se não for encontrado em nenhum dos locais, retorna 404
        return "Ficheiro não encontrado", 404

# --- ROTAS DA API (BACKEND) ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    surname = data.get('surname')
    email = data.get('email')
    password = data.get('password')

    if not all([name, surname, email, password]):
        return jsonify({"message": "Todos os campos são obrigatórios."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Este e-mail já está registado."}), 409

    new_user = User(name=name, surname=surname, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "Utilizador registado com sucesso!"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "E-mail e palavra-passe são obrigatórios."}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        session['user_id'] = user.id
        session['user_email'] = user.email
        session['user_name'] = user.name
        print(f"Utilizador {user.name} logado. Sessão: {session}")
        return jsonify({"message": "Login bem-sucedido", "user_name": user.name, "user_email": user.email}), 200
    else:
        print("Login falhou: Credenciais inválidas")
        return jsonify({"message": "E-mail ou palavra-passe inválidos."}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    session.pop('user_id', None)
    session.pop('user_email', None)
    session.pop('user_name', None)
    print("Utilizador desconectado. Sessão limpa.")
    return jsonify({"message": "Logout bem-sucedido"}), 200

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    print("\n--- Rota /api/forgot-password foi acionada ---")
    try:
        data = request.get_json()
        print(f"Dados recebidos na requisição forgot-password: {data}")
    except Exception as e:
        print(f"Erro ao obter JSON da requisição forgot-password: {e}")
        return jsonify({'message': 'Erro ao processar os dados da requisição.'}), 400

    email = data.get('email')

    if not email:
        print("Erro: E-mail em falta na requisição forgot-password.")
        return jsonify({'message': 'Por favor, forneça o e-mail para recuperação.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        print(f"Info: Tentativa de recuperação para e-mail não registado: {email}")
        return jsonify({"message": "Se o e-mail estiver registado, um link para redefinir a sua palavra-passe foi enviado para ele."}), 200

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(hours=1)

    new_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.session.add(new_token)
    db.session.commit()
    print(f"Token de recuperação gerado e salvo para o utilizador {user.email}.")

    # Use uma variável de ambiente para o domínio do frontend em produção
    frontend_base_url = os.environ.get('FRONTEND_BASE_URL', 'http://127.0.0.1:5500')
    reset_link = f"{frontend_base_url}/redefinir-senha.html?token={token}"

    print(f"\n--- SIMULAÇÃO DE E-MAIL DE RECUPERAÇÃO DE PALAVRA-PASSE ---")
    print(f"Para: {user.email}")
    print(f"Assunto: Redefinição de Palavra-Passe")
    print(f"Corpo: Olá {user.name},\n\nVocê solicitou a redefinição da sua palavra-passe. Clique no link abaixo para redefinir:\n{reset_link}\n\nEste link é válido por 1 hora.\n\nSe você não solicitou isso, por favor, ignore este e-mail.")
    print(f"--- FIM DA SIMULAÇÃO ---\n")

    return jsonify({"message": "Se o e-mail estiver registado, um link para redefinir a sua palavra-passe foi enviado para ele."}), 200

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    print("\n--- Rota /api/reset-password foi acionada ---")
    try:
        data = request.get_json()
        print(f"Dados recebidos na requisição: {data}")
    except Exception as e:
        print(f"Erro ao obter JSON da requisição: {e}")
        return jsonify({'message': 'Erro ao processar os dados da requisição.'}), 400

    token = data.get('token')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')

    if not all([token, new_password, confirm_password]):
        print("Erro: Token ou nova palavra-passe em falta.")
        return jsonify({'message': 'Token e nova palavra-passe são obrigatórios.'}), 400

    if new_password != confirm_password:
        print("Erro: As palavras-passe não coincidem.")
        return jsonify({'message': 'As palavras-passe não coincidem.'}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()

    if not reset_token:
        print(f"Erro: Token '{token}' inválido ou já utilizado.")
        return jsonify({'message': 'Token inválido ou já utilizado.'}), 400

    # Converter expires_at para um datetime com fuso horário UTC para comparação
    # Se expires_at não tiver fuso horário, adicione UTC a ele
    if reset_token.expires_at.tzinfo is None:
        expires_at_aware = reset_token.expires_at.replace(tzinfo=UTC)
    else:
        expires_at_aware = reset_token.expires_at

    if expires_at_aware < datetime.now(UTC):
        print(f"Erro: Token expirado. Expira em: {reset_token.expires_at}, Agora: {datetime.now(UTC)}")
        return jsonify({'message': 'Token expirado.'}), 400

    user = User.query.get(reset_token.user_id)
    if not user:
        print(f"Erro: Utilizador com ID {reset_token.user_id} associado ao token não encontrado.")
        return jsonify({'message': 'Utilizador associado ao token não encontrado.'}), 404

    user.set_password(new_password)
    reset_token.used = True
    db.session.commit()
    print(f"Sucesso: Palavra-passe para o utilizador {user.email} redefinida com sucesso. Token usado.")

    return jsonify({'message': 'Palavra-passe redefinida com sucesso!'}), 200

@app.route('/api/children', methods=['POST'])
@login_required
def add_child():
    data = request.get_json()
    full_name = data.get('full_name')
    gender = data.get('gender')
    date_of_birth_str = data.get('date_of_birth')
    monthly_alimony_value = data.get('monthly_alimony_value')
    user_id = session.get('user_id')
    enabled_years = data.get('enabled_years', [datetime.now().year])

    if not all([full_name, gender, date_of_birth_str, monthly_alimony_value]):
        return jsonify({'message': 'Dados em falta'}), 400

    try:
        date_of_birth = datetime.strptime(date_of_birth_str, '%Y-%m-%d').date()
        monthly_alimony_value = float(monthly_alimony_value)
    except (ValueError, TypeError):
        return jsonify({'message': 'Formato de data ou valor inválido'}), 400

    new_child = Child(
        user_id=user_id,
        full_name=full_name,
        gender=gender,
        date_of_birth=date_of_birth,
        monthly_alimony_value=monthly_alimony_value,
        enabled_years=enabled_years
    )
    db.session.add(new_child)
    db.session.commit()
    return jsonify({'message': 'Filho adicionado com sucesso', 'child': new_child.to_dict()}), 201

@app.route('/api/children', methods=['GET'])
@login_required
def get_children():
    user_id = session.get('user_id')
    children = Child.query.filter_by(user_id=user_id).all()
    return jsonify([child.to_dict() for child in children]), 200

@app.route('/api/children/<int:child_id>', methods=['GET'])
@login_required
def get_child_detail(child_id):
    user_id = session.get('user_id')
    child = Child.query.filter_by(id=child_id, user_id=user_id).first()

    if not child:
        return jsonify({'message': 'Filho não encontrado ou não autorizado'}), 404

    return jsonify(child.to_dict()), 200

@app.route('/api/children/<int:child_id>', methods=['PUT'])
@login_required
def update_child(child_id):
    user_id = session.get('user_id')
    child = Child.query.filter_by(id=child_id, user_id=user_id).first()

    if not child:
        return jsonify({'message': 'Filho não encontrado ou não autorizado'}), 404

    data = request.get_json()
    child.full_name = data.get('full_name', child.full_name)
    child.gender = data.get('gender', child.gender)

    date_of_birth_str = data.get('date_of_birth')
    if date_of_birth_str:
        try:
            child.date_of_birth = datetime.strptime(date_of_birth_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Formato de data inválido'}), 400

    monthly_alimony_value = data.get('monthly_alimony_value')
    if monthly_alimony_value is not None:
        try:
            child.monthly_alimony_value = float(monthly_alimony_value)
        except (ValueError, TypeError):
            return jsonify({'message': 'Formato de valor de pensão mensal inválido'}), 400

    enabled_years_data = data.get('enabled_years')
    if enabled_years_data is not None:
        if isinstance(enabled_years_data, list):
            child.enabled_years = enabled_years_data
        else:
            return jsonify({'message': 'Formato de anos habilitados inválido. Deve ser uma lista.'}), 400

    db.session.commit()
    return jsonify({'message': 'Filho atualizado com sucesso', 'child': child.to_dict()}), 200

@app.route('/api/children/<int:child_id>', methods=['DELETE'])
@login_required
def delete_child(child_id):
    user_id = session.get('user_id')
    child = Child.query.filter_by(id=child_id, user_id=user_id).first()

    if not child:
        return jsonify({'message': 'Filho não encontrado ou não autorizado'}), 404

    db.session.delete(child)
    db.session.commit()
    return jsonify({'message': 'Filho excluído com sucesso'}), 200

@app.route('/api/payments', methods=['POST'])
@login_required
def add_payment():
    data = request.get_json()
    child_id = data.get('child_id')
    amount_from_frontend = data.get('amount')
    payment_date_str = data.get('payment_date')
    month_reference = data.get('month_reference')
    year_reference = data.get('year_reference')
    user_id = session.get('user_id')

    if not all([child_id, amount_from_frontend, payment_date_str]):
        return jsonify({'message': 'Dados em falta'}), 400

    child = Child.query.filter_by(id=child_id, user_id=user_id).first()
    if not child:
        return jsonify({'message': 'Filho não encontrado ou não autorizado para este utilizador'}), 404

    try:
        payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
        amount_float = float(amount_from_frontend)
        if month_reference is not None: month_reference = int(month_reference)
        if year_reference is not None: year_reference = int(year_reference)
    except (ValueError, TypeError):
        return jsonify({'message': 'Formato de data, valor, mês ou ano inválido'}), 400

    if payment_date > date.today():
        return jsonify({'message': 'A data de pagamento não pode ser no futuro'}), 400

    new_payment = Payment(
        child_id=child_id,
        value_paid=amount_float,
        payment_date=payment_date,
        month_reference=month_reference,
        year_reference=year_reference
    )
    db.session.add(new_payment)
    db.session.commit()
    return jsonify({'message': 'Pagamento adicionado com sucesso', 'payment': new_payment.to_dict()}), 201

@app.route('/api/payments/<int:child_id>', methods=['GET'])
@login_required
def get_payments_by_child_id(child_id):
    user_id = session.get('user_id')

    child = Child.query.filter_by(id=child_id, user_id=user_id).first()
    if not child:
        return jsonify({'message': 'Filho não encontrado ou não autorizado'}), 404

    try:
        payments = Payment.query.filter_by(child_id=child_id).order_by(Payment.payment_date).all()
        return jsonify([payment.to_dict() for payment in payments]), 200
    except Exception as e:
        print(f"Erro no banco de dados ao buscar pagamentos: {e}")
        return jsonify({'message': 'Erro interno do servidor ao buscar pagamentos', 'error': str(e)}), 500

@app.route('/api/payments/<int:payment_id>', methods=['PUT'])
@login_required
def update_payment(payment_id):
    data = request.get_json()
    amount_from_frontend = data.get('amount')
    payment_date_str = data.get('payment_date')
    month_reference = data.get('month_reference')
    year_reference = data.get('year_reference')
    user_id = session.get('user_id')

    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({'message': 'Pagamento não encontrado'}), 404

    child = Child.query.filter_by(id=payment.child_id, user_id=user_id).first()
    if not child:
        return jsonify({'message': 'Não autorizado: O pagamento não pertence ao seu filho'}), 403

    if amount_from_frontend is not None:
        try:
            payment.value_paid = float(amount_from_frontend)
        except (ValueError, TypeError):
            return jsonify({'message': 'Formato de valor inválido'}), 400

    if payment_date_str:
        try:
            new_payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
            if new_payment_date > date.today():
                return jsonify({'message': 'A data de pagamento não pode ser no futuro'}), 400
            payment.payment_date = new_payment_date
        except ValueError:
            return jsonify({'message': 'Formato de data inválido'}), 400

    if month_reference is not None:
        try:
            payment.month_reference = int(month_reference)
        except ValueError:
            return jsonify({'message': 'Formato de mês de referência inválido'}), 400
    if year_reference is not None:
        try:
            payment.year_reference = int(year_reference)
        except ValueError:
            return jsonify({'message': 'Formato de ano de referência inválido'}), 400

    db.session.commit()
    return jsonify({'message': 'Pagamento atualizado com sucesso', 'payment': payment.to_dict()}), 200

@app.route('/api/payments/<int:payment_id>', methods=['DELETE'])
@login_required
def delete_payment(payment_id):
    user_id = session.get('user_id')
    payment = Payment.query.get(payment_id)

    if not payment:
        return jsonify({'message': 'Pagamento não encontrado'}), 404

    child = Child.query.filter_by(id=payment.child_id, user_id=user_id).first()
    if not child:
        return jsonify({'message': 'Não autorizado: O pagamento não pertence ao seu filho'}), 403

    db.session.delete(payment)
    db.session.commit()
    return jsonify({'message': 'Pagamento excluído com sucesso'}), 200

# Comentado para deploy em produção, o servidor WSGI (Gunicorn) irá iniciar a aplicação
# if __name__ == '__main__':
#     app.run(debug=True, port=5000)
