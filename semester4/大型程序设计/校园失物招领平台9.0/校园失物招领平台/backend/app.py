# =========================
# 基础配置与初始化
# =========================
import os
import pyodbc
import uuid
import json
import threading
from flask import Flask, request, jsonify, send_from_directory, redirect, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import random
from openai import OpenAI
from flask_mail import Mail, Message
import hashlib
from pytz import timezone

# --- LLM、邮件、数据库等配置 ---
LLM_API_KEY = os.environ.get("LLM_API_KEY", "sk-480bcd884a654bf4b74553f2d8b53521")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend'))
app.config['MAIL_SERVER'] = 'smtp.163.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USERNAME'] = '18201588010@163.com'
app.config['MAIL_PASSWORD'] = 'SDSStqxYjytYTLX9'
app.config['MAIL_DEFAULT_SENDER'] = ('校园失物招领平台', '18201588010@163.com')
mail = Mail(app)

DB_DRIVER = os.environ.get('DB_DRIVER', 'ODBC Driver 17 for SQL Server')
DB_SERVER = '10.21.139.237,1433'
CORS(app, resources={r"/api/*": {"origins": "*"}})
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['JSON_AS_ASCII'] = False
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

llm_client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

# =========================
# 数据库与工具函数
# =========================
def get_db_connection():
    """
    获取数据库连接。
    返回数据库连接对象，连接失败时返回 None。
    """
    try:
        conn_str = f'DRIVER={DB_DRIVER};SERVER={DB_SERVER};DATABASE={'LostAndFoundDB'};UID={'sa'};PWD={'111111'};TrustServerCertificate=no'
        conn = pyodbc.connect(conn_str)
        return conn
    except pyodbc.Error as ex:
        print(f"数据库连接失败: {ex.args[0]} - {ex}")
        return None

def allowed_file(filename):
    """
    检查文件名后缀是否为允许的图片类型。
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def hash_password(password):
    """
    对明文密码进行 SHA256 哈希，返回哈希值。
    """
    if not password:
        return ''
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def generate_item_id(item_type, cursor):
    """
    根据物品类型生成唯一的物品ID。
    item_type: 'Lost' 或 'Found'。
    """
    prefix = 'L' if item_type == 'Lost' else 'F'
    while True:
        random_part = str(random.randint(100000000, 999999999))
        item_id = prefix + random_part
        cursor.execute("SELECT COUNT(*) FROM Items WHERE ItemID = ?", item_id)
        if cursor.fetchone()[0] == 0:
            return item_id

def create_notification(cursor, user_id, message, notif_type='General', item_id_1=None, item_id_2=None):
    """
    向数据库插入一条通知消息。
    """
    if user_id:
        cursor.execute(
            "INSERT INTO Notifications (UserID, Message, NotificationType, RelatedItemID_1, RelatedItemID_2) VALUES (?, ?, ?, ?, ?)",
            user_id, message, notif_type, item_id_1, item_id_2
        )

# =========================
# 静态文件与根路由
# =========================
@app.route('/')
def serve_root():
    """
    根路由，重定向到登录页面。
    """
    return redirect(url_for('serve_static', path='login.html'))

@app.route('/<path:path>')
def serve_static(path):
    """
    静态文件服务路由。
    """
    if path == 'volunteer.html':
         return send_from_directory(app.static_folder, 'volunteer.html')
    return send_from_directory(app.static_folder, path)

# =========================
# 用户认证与管理
# =========================
# 注册、登录、找回密码、用户信息修改、密码修改等接口

@app.route('/api/register', methods=['POST'])
def register():
    """
    用户注册接口。
    接收用户名、密码和邮箱，进行用户注册。
    """
    data = request.json
    username = data.get('username')
    password = data.get('password') # 明文
    email = data.get('email')

    if not all([username, password, email]):
        return jsonify({'success': False, 'message': '所有字段均为必填项'}), 400
    password_hash = hash_password(password)
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT UserID FROM Users WHERE Username = ?", username)
        if cursor.fetchone():
            return jsonify({'success': False, 'message': '用户名已存在'}), 409
        cursor.execute("SELECT UserID FROM Users WHERE Email = ?", email)
        if cursor.fetchone():
            return jsonify({'success': False, 'message': '邮箱已被注册'}), 409
        # 修改点：向 Password 字段插入空字符串''，而不是明文 password
        cursor.execute("INSERT INTO Users (Username, Password, PasswordHash, UserRole, Email) VALUES (?, ?, ?, ?, ?)",
                       username, '', password_hash, '普通用户', email)
        conn.commit()
        return jsonify({'success': True, 'message': '注册成功！'})
    except Exception as e:
        conn.rollback()
        print(f"Register error: {e}")
        return jsonify({'success': False, 'message': '注册时发生服务器错误'}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    """
    用户登录接口。
    接收用户名和密码，返回用户信息及登录状态。
    """
    data = request.json
    username = data.get('username')
    password = data.get('password') # 接收明文密码

    # 检查明文密码是否为空
    if not password:
        return jsonify({'success': False, 'message': '密码不能为空'}), 400

    # 在后端进行哈希
    password_hash = hash_password(password)

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()
    # 使用哈希值进行数据库查询
    cursor.execute("SELECT UserID, Username, UserRole, Email FROM Users WHERE Username = ? AND PasswordHash = ?", username, password_hash)
    user = cursor.fetchone()
    conn.close() # 关闭连接
    
    if user:
        return jsonify({'success': True, 'user': {
            'userID': user.UserID,
            'username': user.Username,
            'userRole': user.UserRole,
            'email': user.Email
        }})
    else:
        return jsonify({'success': False, 'message': '用户名或密码错误'}), 401

@app.route('/api/get-email-by-username', methods=['POST'])
def get_email_by_username():
    """
    根据用户名获取注册时填写的邮箱。
    """
    data = request.json
    username = data.get('username')
    if not username:
        return jsonify({'success': False, 'message': '必须提供用户名'}), 400

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()
    cursor.execute("SELECT Email FROM Users WHERE Username = ?", username)
    user = cursor.fetchone()
    conn.close()

    if user:
        # 为了安全，对邮箱进行部分隐藏
        email_parts = user.Email.split('@')
        email_prefix = email_parts[0]
        masked_prefix = email_prefix[:3] + '***' if len(email_prefix) > 3 else email_prefix
        masked_email = f"{masked_prefix}@{email_parts[1]}"
        return jsonify({'success': True, 'email': masked_email})
    else:
        return jsonify({'success': False, 'message': '未找到该用户'}), 404

@app.route('/api/send-reset-code', methods=['POST'])
def send_reset_code():
    """
    发送密码重置验证码。
    接收用户名，发送包含验证码的邮件。
    """
    data = request.json
    username = data.get('username')
    if not username:
        return jsonify({'success': False, 'message': '必须提供用户名'}), 400

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()
    cursor.execute("SELECT Email FROM Users WHERE Username = ?", username)
    user = cursor.fetchone()

    if not user:
        conn.close()
        # 即使找不到用户也返回成功，防止攻击者探测
        return jsonify({'success': True, 'message': '验证码已发送'})

    try:
        # 生成6位数字验证码
        code = f"{random.randint(100000, 999999)}"
        # 设置10分钟后过期
        expiry_time = datetime.utcnow() + timedelta(minutes=10)

        cursor.execute("UPDATE Users SET ResetCode = ?, ResetCodeExpiry = ? WHERE Username = ?", code, expiry_time, username)
        conn.commit()

        # 发送邮件
        msg = Message("密码重置验证码", recipients=[user.Email])
        msg.body = f"您的密码重置验证码是：{code}。该验证码将在10分钟内失效。"
        with app.app_context():
            mail.send(msg)

        return jsonify({'success': True, 'message': '验证码已发送'})
    except Exception as e:
        print(f"Send reset code error: {e}")
        return jsonify({'success': False, 'message': '邮件发送失败，请稍后重试'}), 500
    finally:
        conn.close()

@app.route('/api/notifications/mark-read/<int:notification_id>', methods=['POST'])
def mark_notification_as_read(notification_id):
    """
    标记通知为已读。
    接收通知ID和用户ID，更新通知状态。
    """
    data = request.json
    user_id = data.get('userID')
    if not user_id:
        return jsonify({'success': False, 'message': '用户ID缺失'}), 400

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()
    try:
        # 在更新前，先检查通知是否未读并且属于该用户
        cursor.execute(
            "SELECT IsRead FROM Notifications WHERE NotificationID = ? AND UserID = ?",
            notification_id, user_id
        )
        notification = cursor.fetchone()

        if not notification:
            return jsonify({'success': False, 'message': '通知不存在或无权限'}), 404

        # 如果通知已经是已读状态，直接返回成功，避免重复计算
        if notification.IsRead:
            return jsonify({'success': True, 'message': '通知已经是已读状态'})

        cursor.execute(
            "UPDATE Notifications SET IsRead = 1 WHERE NotificationID = ? AND UserID = ?",
            notification_id, user_id
        )
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({'success': True, 'message': '通知已标记为已读'})
        else:
            # 这种情况理论上不会发生，因为前面已经检查过了
            return jsonify({'success': False, 'message': '操作失败'}), 400
            
    except Exception as e:
        conn.rollback()
        print(f"Mark notification as read error: {e}")
        return jsonify({'success': False, 'message': '服务器错误'}), 500
    finally:
        conn.close()

@app.route('/api/reset-password-with-code', methods=['POST'])
def reset_password_with_code():
    """
    使用验证码重置密码。
    接收用户名、验证码和新密码，更新用户密码。
    """
    data = request.json
    username = data.get('username')
    code = data.get('code')
    new_password = data.get('newPassword') # 只接收新密码的明文

    # 检查所有必要参数
    if not all([username, code, new_password]):
        return jsonify({'success': False, 'message': '缺少必要参数'}), 400

    # 在后端自己生成哈希值
    new_password_hash = hash_password(new_password)

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT ResetCode, ResetCodeExpiry FROM Users WHERE Username = ?", username)
        user = cursor.fetchone()

        if not user or user.ResetCode != code:
            return jsonify({'success': False, 'message': '验证码错误'}), 400

        if user.ResetCodeExpiry < datetime.utcnow():
            return jsonify({'success': False, 'message': '验证码已过期'}), 400

        # 修改点：更新 Password 字段为空字符串''
        cursor.execute("UPDATE Users SET Password = ?, PasswordHash = ?, ResetCode = NULL, ResetCodeExpiry = NULL WHERE Username = ?",
                       '', new_password_hash, username)
        conn.commit()

        return jsonify({'success': True, 'message': '密码重置成功！'})
    except Exception as e:
        conn.rollback()
        print(f"Reset password with code error: {e}")
        return jsonify({'success': False, 'message': '密码重置失败'}), 500
    finally:
        conn.close()

@app.route('/api/user/update', methods=['POST'])
def update_user_info():
    """
    更新用户信息。
    接收用户ID、用户名和邮箱，修改用户信息。
    """
    data = request.json
    user_id, username, email = data.get('userID'), data.get('username'), data.get('email')
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库错误'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Users SET Username = ?, Email = ? WHERE UserID = ?", username, email, user_id)
        create_notification(cursor, user_id, "您的个人信息已成功修改。")
        conn.commit()
        return jsonify({'success': True, 'message': '信息更新成功'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'更新失败: {e}'}), 500
    finally:
        conn.close()

@app.route('/api/user/change-password', methods=['POST'])
def change_password():
    """
    修改用户密码。
    接收用户ID、原密码和新密码，更新用户密码。
    """
    data = request.json
    user_id = data.get('userID')
    old_password = data.get('oldPassword')
    new_password = data.get('newPassword')
    # 修改：将接收的字段名从 confirmNewPassword 改为 confirmPassword
    confirm_password = data.get('confirmPassword')

    # 判空逻辑
    if user_id is None or not old_password or not new_password or not confirm_password:
        return jsonify({'success': False, 'message': '所有字段均为必填项'}), 400

    # 新密码和确认新密码必须一致
    if new_password != confirm_password:
        return jsonify({'success': False, 'message': '两次输入的新密码不一致'}), 400

    # 对接收到的明文原密码进行哈希
    old_password_hash = hash_password(old_password)
    # 对接收到的明文新密码进行哈希
    new_password_hash = hash_password(new_password)

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': '数据库错误'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT PasswordHash FROM Users WHERE UserID = ?", user_id)
        user = cursor.fetchone()
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404

        # 核心逻辑：用哈希后的原密码与数据库中的哈希密码进行比较
        if user.PasswordHash != old_password_hash:
            return jsonify({'success': False, 'message': '原密码不正确，请重新输入'}), 400

        # 修改点：更新 Password 字段为空字符串''
        cursor.execute("UPDATE Users SET Password = ?, PasswordHash = ? WHERE UserID = ?", '', new_password_hash, user_id)
        create_notification(cursor, user_id, "您的密码已成功修改。")
        conn.commit()
        return jsonify({'success': True, 'message': '密码修改成功'})
    except Exception as e:
        conn.rollback()
        print(f"Change password error: {e}")
        return jsonify({'success': False, 'message': f'修改失败: {e}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/user/delete/<int:user_id_to_delete>', methods=['DELETE'])
def admin_delete_user(user_id_to_delete):
    """
    管理员删除用户。
    接收要删除的用户ID，执行用户删除操作。
    """
    data = request.json
    admin_id = data.get('adminID')
    
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库错误'}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT UserRole FROM Users WHERE UserID = ?", admin_id)
        admin = cursor.fetchone()
        if not admin or admin.UserRole != '管理员':
            return jsonify({'success': False, 'message': '无权限操作'}), 403

        if admin_id == user_id_to_delete:
            return jsonify({'success': False, 'message': '不能删除自己的账户'}), 400

        # Note: This is a hard delete. Ensure database constraints (ON DELETE CASCADE) are set up correctly.
        cursor.execute("DELETE FROM Users WHERE UserID = ?", user_id_to_delete)
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({'success': True, 'message': '用户已永久删除'})
        else:
            return jsonify({'success': False, 'message': '未找到该用户'}), 404

    except pyodbc.IntegrityError:
        conn.rollback()
        return jsonify({'success': False, 'message': '删除失败。请先移除该用户发布的物品或关联的聊天记录。'}), 409
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'删除时发生错误: {e}'}), 500
    finally:
        conn.close()

@app.route('/api/admin/item/update', methods=['POST'])
def admin_update_item():
    """
    管理员更新物品信息。
    接收物品ID和更新的物品信息，修改物品记录。
    """
    data = request.json
    admin_id = data.get('adminID')
    
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库错误'}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT UserRole FROM Users WHERE UserID = ?", admin_id)
        admin = cursor.fetchone()
        if not admin or admin.UserRole != '管理员':
            return jsonify({'success': False, 'message': '无权限操作'}), 403

        item_id = data.get('itemID')
        item_name = data.get('itemName')
        item_status = data.get('itemStatus')
        description = data.get('description')
        
        cursor.execute("UPDATE Items SET ItemName = ?, ItemStatus = ?, Description = ? WHERE ItemID = ?",
                       item_name, item_status, description, item_id)
        conn.commit()
        
        return jsonify({'success': True, 'message': '物品信息更新成功'})

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'更新失败: {e}'}), 500
    finally:
        conn.close()

# =========================
# 管理员功能
# =========================
@app.route('/api/admin/item/delete/<string:item_id>', methods=['DELETE'])
def admin_delete_item(item_id):
    """
    管理员删除物品。
    接收物品ID，执行物品删除操作。
    """
    data = request.json
    admin_id = data.get('adminID')

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库错误'}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT UserRole FROM Users WHERE UserID = ?", admin_id)
        admin = cursor.fetchone()
        if not admin or admin.UserRole != '管理员':
            return jsonify({'success': False, 'message': '无权限操作'}), 403
        
        # We perform a logical delete by changing the status.
        cursor.execute("UPDATE Items SET ItemStatus = N'已删除' WHERE ItemID = ?", item_id)
        conn.commit()

        if cursor.rowcount > 0:
            return jsonify({'success': True, 'message': '物品已标记为删除'})
        else:
            return jsonify({'success': False, 'message': '未找到该物品'}), 404
            
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'删除失败: {e}'}), 500
    finally:
        conn.close()

# =========================
# 物品管理
# =========================
# 物品的增删查改、用户物品列表等接口

@app.route('/api/items', methods=['GET'])
def get_items():
    """
    获取物品列表。
    支持根据类型、搜索词和分类过滤。
    """
    item_type = request.args.get('type')
    search_term = request.args.get('search', '')
    categories = request.args.getlist('category')

    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    cursor = conn.cursor()

    sql_query = """
        SELECT i.*, u.Username as posterUsername
        FROM Items i
        LEFT JOIN Users u ON i.UserID = u.UserID
        WHERE i.ItemType = ? AND i.ItemStatus NOT IN (N'已删除')
    """
    params = [item_type]

    if search_term:
        sql_query += " AND (i.ItemName LIKE ? OR i.Description LIKE ? OR i.Location LIKE ?)"
        search_like = f"%{search_term}%"
        params.extend([search_like, search_like, search_like])

    if categories:
        placeholders = ','.join(['?'] * len(categories))
        sql_query += f" AND i.Category IN ({placeholders})"
        params.extend(categories)

    sql_query += " ORDER BY i.PostTime DESC"

    cursor.execute(sql_query, params)
    columns = [column[0] for column in cursor.description]
    items = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return jsonify(items)

@app.route('/api/items', methods=['POST'])
def add_item():
    """
    发布新物品信息。
    接收物品的各类信息，插入数据库。
    """
    user_id = request.form.get('userID')
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT UserRole FROM Users WHERE UserID = ?", user_id)
        user = cursor.fetchone()
        if not user or user.UserRole in ['志愿者', '管理员']:
            return jsonify({'success': False, 'message': '您没有权限发布信息'}), 403

        item_type = request.form.get('itemType')
        item_name = request.form.get('itemName')
        event_time_str = request.form.get('eventTime')

        if not all([item_type, item_name, event_time_str]):
            return jsonify({'success': False, 'message': '缺少必要信息'}), 400

        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = str(uuid.uuid4()) + "_" + secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_path = os.path.join('uploads', filename).replace("\\", "/")
        
        if item_type == 'Found' and not image_path:
            return jsonify({'success': False, 'message': '捡到物品必须上传图片'}), 400

        item_id = generate_item_id(item_type, cursor)
        # 统一将 event_time 视为前端传来的 ISO 字符串（本地时间），强制转为东八区北京时间
        event_time = datetime.fromisoformat(event_time_str)
        if event_time.tzinfo is None:
            event_time = event_time + timedelta(hours=8 - (datetime.now().astimezone().utcoffset().total_seconds() // 3600))
        else:
            event_time = event_time.astimezone(timezone(timedelta(hours=8))).replace(tzinfo=None)
        cursor.execute(
            "INSERT INTO Items (ItemID, UserID, ItemType, ItemName, Category, Color, Location, EventTime, Description, ImagePath, ItemStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            item_id, user_id, item_type, request.form.get('itemName'), request.form.get('category', '其他'), request.form.get('color', '未知'), request.form.get('location', '未知'), event_time, request.form.get('description', ''), image_path, '未找到'
        )
        conn.commit()
        return jsonify({'success': True, 'message': '信息发布成功！', 'itemID': item_id})
    except Exception as e:
        conn.rollback()
        print(f"Add item error: {e}")
        return jsonify({'success': False, 'message': '发布失败'}), 500
    finally:
        conn.close()

@app.route('/api/items/<string:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """
    删除物品信息。
    接收物品ID，执行逻辑删除操作。
    """
    user_id = request.json.get('userID')
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库错误'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT UserID, UserRole FROM Users WHERE UserID = ?", user_id)
        user = cursor.fetchone()
        cursor.execute("SELECT UserID FROM Items WHERE ItemID = ?", item_id)
        item = cursor.fetchone()

        if not user or not item:
            return jsonify({'success': False, 'message': '未找到用户或物品'}), 404

        if user.UserID == item.UserID or user.UserRole == '管理员':
            cursor.execute("UPDATE Items SET ItemStatus = N'已删除' WHERE ItemID = ?", item_id)
            conn.commit()
            return jsonify({'success': True, 'message': '删除成功'})
        else:
            return jsonify({'success': False, 'message': '无权删除'}), 403
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'删除失败: {e}'}), 500
    finally:
        conn.close()

@app.route('/api/items/user/<int:user_id>', methods=['GET'])
def get_user_items(user_id):
    """
    获取用户发布的物品列表。
    支持根据物品类型和状态过滤。
    """
    item_type_filter = request.args.get('type')
    status_filter = request.args.get('status')

    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    cursor = conn.cursor()
    
    sql = "SELECT * FROM Items WHERE UserID = ? AND ItemStatus <> N'已删除'"
    params = [user_id]
    
    if item_type_filter:
        sql += " AND ItemType = ?"
        params.append(item_type_filter)
    
    if status_filter:
        sql += " AND ItemStatus = ?"
        params.append(status_filter)

    sql += " ORDER BY PostTime DESC"
    
    cursor.execute(sql, params)
    columns = [column[0] for column in cursor.description]
    items = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return jsonify(items)

@app.route('/api/item/update', methods=['POST'])
def update_item():
    """
    更新物品信息。
    接收物品ID和要更新的字段，修改物品记录。
    """
    data = request.json
    user_id = data.get('userID')
    item_id = data.get('itemID')

    if not all([user_id, item_id]):
        return jsonify({'success': False, 'message': '缺少必要的用户或物品ID'}), 400

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()

    try:
        # 验证该物品是否属于该用户
        cursor.execute("SELECT UserID FROM Items WHERE ItemID = ?", item_id)
        item = cursor.fetchone()
        if not item or item.UserID != user_id:
            return jsonify({'success': False, 'message': '无权限修改此物品'}), 403

        # 从请求中获取要更新的字段
        item_name = data.get('itemName')
        category = data.get('category')
        color = data.get('color')
        location = data.get('location')
        event_time = datetime.fromisoformat(data.get('eventTime'))
        description = data.get('description')
        item_status = data.get('itemStatus')

        # 执行更新操作（主物品）
        sql_update = """
            UPDATE Items SET
            ItemName = ?, Category = ?, Color = ?, Location = ?,
            EventTime = ?, Description = ?, ItemStatus = ?
            WHERE ItemID = ? AND UserID = ?
        """
        cursor.execute(sql_update, item_name, category, color, location, event_time, description, item_status, item_id, user_id)
        
        # 如果物品被失主标记为“已找回”，同时更新匹配物品的状态
        if item_status == '已找回':
            cursor.execute("SELECT MatchItemID FROM Items WHERE ItemID = ?", item_id)
            match_item_row = cursor.fetchone()
            if match_item_row and match_item_row.MatchItemID:
                cursor.execute("UPDATE Items SET ItemStatus = N'已找回' WHERE ItemID = ?", match_item_row.MatchItemID)

        conn.commit()
        return jsonify({'success': True, 'message': '物品信息更新成功！'})

    except Exception as e:
        conn.rollback()
        print(f"Update item error: {e}")
        return jsonify({'success': False, 'message': '更新失败，服务器发生错误'}), 500
    finally:
        conn.close()

# =========================
# 认领与聊天
# =========================
# 认领流程、消息发送与获取、聊天会话管理、认领结果处理等接口

@app.route('/api/claim/initiate', methods=['POST'])
def initiate_claim():
    """
    发起认领请求。
    接收认领人ID和拾物ID，创建认领记录。
    """
    data = request.json
    claimant_id = data.get('userID')
    found_item_id = data.get('foundItemID')
    match_lost_item_id = data.get('matchLostItemID') # May be None

    if not claimant_id or not found_item_id:
        return jsonify({'success': False, 'message': '缺少必要参数'}), 400

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()

    try:
        # 获取拾物信息
        cursor.execute("SELECT i.UserID, i.ItemName, u.Username FROM Items i JOIN Users u ON i.UserID = u.UserID WHERE i.ItemID = ?", found_item_id)
        found_item = cursor.fetchone()
        if not found_item:
            return jsonify({'success': False, 'message': '拾物信息不存在'}), 404
        
        finder_id = found_item.UserID
        finder_username = found_item.Username
        found_item_name = found_item.ItemName

        # 检查是否认领自己的物品
        if int(claimant_id) == finder_id:
            return jsonify({'success': False, 'message': '您不能认领自己发布的拾物'}), 403

        lost_item_id_to_use = match_lost_item_id
        
        # 如果用户没有选择已有的失物，为他创建一个占位失物信息
        if not match_lost_item_id:
            lost_item_id_to_use = generate_item_id('Lost', cursor)
            item_name = f"对“{found_item_name}”的认领"
            description = f"此条目为系统自动生成，用于用户(ID: {claimant_id})与拾主(ID: {finder_id})就物品(ID: {found_item_id})进行沟通。"
            cursor.execute(
                "INSERT INTO Items (ItemID, UserID, ItemType, ItemName, Description, ItemStatus) VALUES (?, ?, 'Lost', ?, ?, N'正在联系中')",
                lost_item_id_to_use, claimant_id, item_name, description
            )
            lost_item_name = item_name
        else: # 如果用户选择了已有失物
            cursor.execute("SELECT ItemName FROM Items WHERE ItemID = ? AND UserID = ?", match_lost_item_id, claimant_id)
            lost_item = cursor.fetchone()
            if not lost_item:
                 return jsonify({'success': False, 'message': '您选择的失物信息无效或不属于您'}), 403
            lost_item_name = lost_item.ItemName

        # 更新两个物品的状态为“正在联系中”，并互相链接
        new_status = '正在联系中'
        cursor.execute("UPDATE Items SET ItemStatus = ?, MatchItemID = ? WHERE ItemID = ?", new_status, found_item_id, lost_item_id_to_use)
        cursor.execute("UPDATE Items SET ItemStatus = ?, MatchItemID = ? WHERE ItemID = ?", new_status, lost_item_id_to_use, found_item_id)

        # 获取认领人用户名
        cursor.execute("SELECT Username FROM Users WHERE UserID = ?", claimant_id)
        claimant_username = cursor.fetchone().Username
        
        # 给失主（认领人）发通知
        msg_for_claimant = f"您已成功认领物品“{found_item_name}”，系统已为您开启与拾主“{finder_username}”的私信，请尽快沟通确认。"
        create_notification(cursor, claimant_id, msg_for_claimant, 'Match', lost_item_id_to_use, found_item_id)
        
        # 给拾主发通知
        msg_for_finder = f"用户“{claimant_username}”认领了您发布的拾物“{found_item_name}”，并关联到失物“{lost_item_name}”。请进入私信与对方确认。"
        create_notification(cursor, finder_id, msg_for_finder, 'Match', lost_item_id_to_use, found_item_id)

        conn.commit()
        return jsonify({
            'success': True, 
            'message': '认领成功，已开启私信！',
            'lostItemID': lost_item_id_to_use,
            'foundItemID': found_item_id
        })

    except Exception as e:
        conn.rollback()
        print(f"Claim initiate error: {e}")
        return jsonify({'success': False, 'message': '操作失败'}), 500
    finally:
        conn.close()

@app.route('/api/messages/<lost_item_id>/<found_item_id>', methods=['GET'])
def get_messages(lost_item_id, found_item_id):
    """
    获取聊天记录。
    接收失物ID和拾物ID，返回两者之间的消息记录。
    """
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    cursor = conn.cursor()
    sql = """
        SELECT m.MessageID, m.SenderID, u_sender.Username as senderName, m.Content, m.SentTime
        FROM Messages m
        JOIN Users u_sender ON m.SenderID = u_sender.UserID
        WHERE m.LostItemID = ? AND m.FoundItemID = ?
        ORDER BY m.SentTime ASC
    """
    cursor.execute(sql, lost_item_id, found_item_id)
    columns = [column[0] for column in cursor.description]
    messages = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return jsonify(messages)

@app.route('/api/messages', methods=['POST'])
def send_message():
    """
    发送消息。
    接收发送者ID、失物ID、拾物ID和消息内容，插入消息记录。
    """
    sender_id = request.form.get('senderID')
    lost_item_id = request.form.get('lostItemID')
    found_item_id = request.form.get('foundItemID')
    content = request.form.get('content')
    
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()

    try:
        # 首先，获取通知和消息插入所需的通用信息
        cursor.execute("SELECT UserID, ItemName FROM Items WHERE ItemID = ?", lost_item_id)
        lost_item_row = cursor.fetchone()
        cursor.execute("SELECT UserID, ItemName FROM Items WHERE ItemID = ?", found_item_id)
        found_item_row = cursor.fetchone()

        if not lost_item_row or not found_item_row:
             return jsonify({'success': False, 'message': '关联物品不存在'}), 404

        lost_user_id = lost_item_row.UserID
        found_user_id = found_item_row.UserID
        sender_id = int(sender_id)
        receiver_id = found_user_id if sender_id == lost_user_id else lost_user_id
        
        image_path_for_response = None
        message_sent = False

        # --- 修改后的逻辑 ---

        # 1. 优先处理图片消息
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = "msg_" + str(uuid.uuid4()) + "_" + secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                image_path = os.path.join('uploads', filename).replace("\\", "/")
                
                # 将图片路径作为消息内容插入
                cursor.execute(
                    "INSERT INTO Messages (SenderID, ReceiverID, LostItemID, FoundItemID, Content) VALUES (?, ?, ?, ?, ?)",
                    sender_id, receiver_id, lost_item_id, found_item_id, image_path
                )
                message_sent = True
                image_path_for_response = image_path
        
        # 2. 如果没有图片，再处理纯文本消息
        elif content:
            cursor.execute(
                "INSERT INTO Messages (SenderID, ReceiverID, LostItemID, FoundItemID, Content) VALUES (?, ?, ?, ?, ?)",
                sender_id, receiver_id, lost_item_id, found_item_id, content
            )
            message_sent = True

        # 如果没有任何有效内容，则返回错误
        if not message_sent:
            return jsonify({'success': False, 'message': '消息内容不能为空'}), 400

        # 3. 发送通知
        notify_item_name = found_item_row.ItemName if sender_id == lost_user_id else lost_item_row.ItemName
        notification_message = f"您收到关于物品“{notify_item_name}”的新消息。"
        create_notification(cursor, receiver_id, notification_message, 'NewMessage', lost_item_id, found_item_id)
        
        conn.commit()

        # 4. 构建响应
        response_data = {'success': True}
        if image_path_for_response:
            response_data['content'] = image_path_for_response
        
        return jsonify(response_data)
        
    except Exception as e:
        conn.rollback()
        print(f"Send message error: {e}")
        return jsonify({'success': False, 'message': f'发送失败: {e}'}), 500
    finally:
        conn.close()


        
@app.route('/api/chats', methods=['GET'])
def get_user_chats():
    """
    获取用户的聊天会话列表。
    返回用户参与的所有聊天会话的简要信息。
    """
    user_id_str = request.args.get('userID')
    if not user_id_str: return jsonify([]), 400
    user_id = int(user_id_str)

    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    cursor = conn.cursor()

    sql = """
    WITH LastMessages AS (
        SELECT
            LostItemID, FoundItemID, Content, SentTime,
            ROW_NUMBER() OVER(PARTITION BY LostItemID, FoundItemID ORDER BY SentTime DESC) as rn
        FROM Messages
    ),
    ChatPairs AS (
        SELECT DISTINCT LostItemID, FoundItemID
        FROM Messages
        WHERE SenderID = ? OR ReceiverID = ?
    )
    SELECT
        cp.LostItemID, i_lost.ItemName as LostItemName, i_lost.UserID as LostUserID,
        cp.FoundItemID, i_found.ItemName as FoundItemName, i_found.UserID as FoundUserID,
        lm.Content as LastMessage,
        lm.SentTime as LastMessageTime,
        CASE WHEN i_lost.UserID = ? THEN u_found.Username ELSE u_lost.Username END as OtherUsername,
        CASE WHEN i_lost.UserID = ? THEN u_found.UserID ELSE u_lost.UserID END as OtherUserID,
        i_lost.ItemStatus as LostItemStatus
    FROM ChatPairs cp
    JOIN Items i_lost ON cp.LostItemID = i_lost.ItemID
    JOIN Items i_found ON cp.FoundItemID = i_found.ItemID
    JOIN Users u_lost ON i_lost.UserID = u_lost.UserID
    JOIN Users u_found ON i_found.UserID = u_found.UserID
    LEFT JOIN LastMessages lm ON cp.LostItemID = lm.LostItemID AND cp.FoundItemID = lm.FoundItemID AND lm.rn = 1
    WHERE i_lost.ItemStatus <> N'已删除' AND i_found.ItemStatus <> N'已删除'
    ORDER BY lm.SentTime DESC;
    """
    try:
        cursor.execute(sql, user_id, user_id, user_id, user_id)
        columns = [column[0] for column in cursor.description]
        chats = [dict(zip(columns, row)) for row in cursor.fetchall()]
        # Filter out chats that are resolved
        active_chats = [c for c in chats if c.get('LostItemStatus') != '已找回']
        return jsonify(active_chats)
    except Exception as e:
        print(f"Error fetching chats: {e}")
        return jsonify([]), 500
    finally:
        conn.close()


@app.route('/api/chat/resolve', methods=['POST'])
def resolve_chat():
    """
    处理聊天认领结果。
    接收用户ID、失物ID、拾物ID和操作类型，更新物品状态。
    """
    data = request.json
    user_id, lost_item_id, found_item_id, action = data.get('userID'), data.get('lostItemID'), data.get('foundItemID'), data.get('action')

    if not all([user_id, lost_item_id, found_item_id, action]):
        return jsonify({'success': False, 'message': '缺少参数'}), 400

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT UserID, ItemName FROM Items WHERE ItemID = ?", lost_item_id)
        lost_item = cursor.fetchone()
        if not lost_item or user_id != lost_item.UserID:
            return jsonify({'success': False, 'message': '只有失主才能操作'}), 403

        if action == 'found':
            # 标记两个物品为“已找回”
            cursor.execute("UPDATE Items SET ItemStatus = N'已找回' WHERE ItemID IN (?, ?)", lost_item_id, found_item_id)
            message = '操作成功，物品已标记为“已找回”'
        elif action == 'not_found':
             # 如果是系统生成的占位失物，则删除；否则，恢复为“未找到”
            if lost_item.ItemName.startswith("对“") and lost_item.ItemName.endswith("”的认领"):
                cursor.execute("UPDATE Items SET ItemStatus = N'已删除' WHERE ItemID = ?", lost_item_id)
            else:
                cursor.execute("UPDATE Items SET ItemStatus = N'未找到', MatchItemID = NULL WHERE ItemID = ?", lost_item_id)
            
            # 恢复拾物的状态
            cursor.execute("UPDATE Items SET ItemStatus = N'未找到', MatchItemID = NULL WHERE ItemID = ?", found_item_id)
            message = '操作成功，已取消匹配'
        else:
            return jsonify({'success': False, 'message': '无效的操作'}), 400

        conn.commit()
        return jsonify({'success': True, 'message': message})
    except Exception as e:
        conn.rollback()
        print(f"Resolve chat error: {e}")
        return jsonify({'success': False, 'message': '操作失败'}), 500
    finally:
        conn.close()

# =========================
# 通知系统
# =========================
# 通知的获取与已读标记

@app.route('/api/notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    """
    获取用户通知列表。
    接收用户ID，返回该用户的所有通知。
    """
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    cursor = conn.cursor()
    cursor.execute(
        "SELECT NotificationID, RelatedItemID_1, RelatedItemID_2, Message, IsRead, CreationTime, NotificationType FROM Notifications WHERE UserID = ? ORDER BY CreationTime DESC",
        user_id
    )
    columns = [column[0] for column in cursor.description]
    notifications = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return jsonify(notifications)

# =========================
# 志愿者功能
# =========================
# AI智能匹配、人工匹配等接口

@app.route('/api/volunteer/match', methods=['POST'])
def volunteer_ai_match():
    """
    志愿者AI智能匹配接口。
    接收物品ID，返回与之匹配的物品列表。
    """
    data = request.json
    # 1. 接收通用的 itemID
    item_id = data.get('itemID')
    if not item_id:
        return jsonify({'success': False, 'message': '缺少物品ID'}), 400
    
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()

    try:
        # 2. 获取源物品信息
        cursor.execute("SELECT * FROM Items WHERE ItemID = ?", item_id)
        source_item = cursor.fetchone()
        if not source_item:
            return jsonify({'success': False, 'message': '物品不存在'}), 404

        # 3. 根据源物品类型，决定目标物品类型
        source_item_type = source_item.ItemType
        if source_item_type == 'Lost':
            target_item_type = 'Found'
        elif source_item_type == 'Found':
            target_item_type = 'Lost'
        else:
            return jsonify({'success': False, 'message': '未知的物品类型'}), 400

        source_item_desc = f"物品名: {source_item.ItemName}, 类别: {source_item.Category}, 颜色: {source_item.Color}, 地点: {source_item.Location}, 描述: {source_item.Description}"
        
        # 4. 动态查询目标类型的物品
        cursor.execute("SELECT * FROM Items WHERE ItemType = ? AND ItemStatus = N'未找到' AND UserID <> ?", target_item_type, source_item.UserID)
        target_items = cursor.fetchall()
        
        potential_matches = []
        for target_item in target_items:
            target_item_desc = f"物品名: {target_item.ItemName}, 类别: {target_item.Category}, 颜色: {target_item.Color}, 地点: {target_item.Location}, 描述: {target_item.Description}"
            
            try:
                # 5. 根据类型，动态构建 Prompt
                if source_item_type == 'Lost':
                    prompt_content = f"失物: {source_item_desc}\n拾物: {target_item_desc}"
                else: # source_item_type is 'Found'
                    prompt_content = f"失物: {target_item_desc}\n拾物: {source_item_desc}"

                completion = llm_client.chat.completions.create(
                    model="qwen-turbo",
                    messages=[
                        {'role': 'system', 'content': '你是一个失物招领匹配助手。请判断以下两个物品是否高度相似，只需要回答“是”或“否”。'},
                        {'role': 'user', 'content': prompt_content}
                    ],
                    temperature=0
                )
                is_match = completion.choices[0].message.content
                if '是' in is_match:
                    columns = [col[0] for col in cursor.description]
                    potential_matches.append(dict(zip(columns, target_item)))

            except Exception as llm_error:
                print(f"LLM API call failed for found item {target_item.ItemID}: {llm_error}")
                continue
        
        # 6. 返回匹配结果
        return jsonify({'success': True, 'matches': potential_matches})

    except Exception as e:
        print(f"AI Match error: {e}")
        return jsonify({'success': False, 'message': 'AI匹配时发生服务器错误'}), 500
    finally:
        conn.close()

@app.route('/api/volunteer/link', methods=['POST'])
def volunteer_link_items():
    """
    志愿者人工匹配接口。
    接收志愿者ID、失物ID和拾物ID，执行物品关联操作。
    """
    data = request.json
    # 兼容 operatorID 和 volunteerID 字段，优先取 operatorID
    operator_id = data.get('operatorID') or data.get('volunteerID')
    lost_item_id = data.get('lostItemID')
    found_item_id = data.get('foundItemID')

    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()

    try:
        # --- 登录用户校验（只要存在即可） ---
        cursor.execute("SELECT UserRole FROM Users WHERE UserID = ?", operator_id)
        operator = cursor.fetchone()
        if not operator:
            return jsonify({'success': False, 'message': '无效的用户ID或未登录'}), 403

        # --- 数据获取 ---
        cursor.execute("SELECT UserID, ItemName FROM Items WHERE ItemID = ?", lost_item_id)
        lost_item = cursor.fetchone()
        cursor.execute("SELECT UserID, ItemName FROM Items WHERE ItemID = ?", found_item_id)
        found_item = cursor.fetchone()

        if not lost_item or not found_item:
            return jsonify({'success': False, 'message': '物品不存在'}), 404

        if lost_item.UserID == found_item.UserID:
            return jsonify({'success': False, 'message': '不能匹配同一个用户发布的失物和拾物信息！'}), 400

        # --- 状态更新 ---
        new_status = '正在联系中'
        cursor.execute("UPDATE Items SET ItemStatus = ?, MatchItemID = ? WHERE ItemID = ?", new_status, found_item_id, lost_item_id)
        cursor.execute("UPDATE Items SET ItemStatus = ?, MatchItemID = ? WHERE ItemID = ?", new_status, lost_item_id, found_item_id)

        lost_user_id = lost_item.UserID
        found_user_id = found_item.UserID
        
        # --- 站内信通知 ---
        msg_for_loser = f"您已通过智能匹配将您的失物“{lost_item.ItemName}”与拾物“{found_item.ItemName}”进行关联。系统已为您开启私信，请尽快沟通确认。"
        msg_for_finder = f"用户通过智能匹配，认为您捡到的物品“{found_item.ItemName}”是他们丢失的“{lost_item.ItemName}”。系统已为你们开启私信，请进入查看详情。"

        create_notification(cursor, lost_user_id, msg_for_loser, 'Match', lost_item_id, found_item_id)
        create_notification(cursor, found_user_id, msg_for_finder, 'Match', lost_item_id, found_item_id)

        # --- 邮件通知 ---
        with app.app_context():
            subject = '校园失物招领平台物品匹配'
            
            cursor.execute("SELECT Email FROM Users WHERE UserID = ?", lost_user_id)
            lost_user_email_row = cursor.fetchone()
            if lost_user_email_row and lost_user_email_row.Email:
                msg1 = Message(subject=subject, recipients=[lost_user_email_row.Email], body=f"您遗失的“{lost_item.ItemName}”物品可能已找到匹配，请登录失物招领平台进入私信进行联络。")
                mail.send(msg1)
            
            cursor.execute("SELECT Email FROM Users WHERE UserID = ?", found_user_id)
            found_user_email_row = cursor.fetchone()
            if found_user_email_row and found_user_email_row.Email:
                msg2 = Message(subject=subject, recipients=[found_user_email_row.Email], body=f"您捡到的“{found_item.ItemName}”物品可能已找到失主，请登录失物招领平台进入私信进行联络。")
                mail.send(msg2)

        conn.commit()
        return jsonify({'success': True, 'message': '匹配成功，已通知双方用户'})
    except Exception as e:
        conn.rollback()
        print(f"--- VOLUNTEER LINK ERROR ---: {e}")
        return jsonify({'success': False, 'message': '操作失败'}), 500
    finally:
        conn.close()


# =========================
# 管理员功能
# =========================
@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    """
    获取所有用户信息。
    管理员接口，返回系统中所有用户的详细信息。
    """
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    cursor = conn.cursor()
    cursor.execute("SELECT UserID, Username, UserRole, Email, RegistrationDate FROM Users")
    columns = [column[0] for column in cursor.description]
    users = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return jsonify(users)

@app.route('/api/admin/items', methods=['GET'])
def get_all_items():
    """
    获取所有物品信息。
    管理员接口，返回系统中所有物品的详细信息。
    """
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    cursor = conn.cursor()
    cursor.execute("SELECT ItemID, ItemName, ItemType, ItemStatus, UserID, MatchItemID FROM Items ORDER BY PostTime DESC")
    columns = [column[0] for column in cursor.description]
    items = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return jsonify(items)
    
@app.route('/api/admin/user/update', methods=['POST'])
def admin_update_user():
    """
    管理员更新用户信息。
    接收用户ID和更新的信息，修改用户记录。
    """
    data = request.json
    admin_id = data.get('adminID')
    user_id_to_edit = data.get('userID')
    
    conn = get_db_connection()
    if not conn: return jsonify({'success': False, 'message': '数据库错误'}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT UserRole FROM Users WHERE UserID = ?", admin_id)
        admin = cursor.fetchone()
        if not admin or admin.UserRole != '管理员':
            return jsonify({'success': False, 'message': '无权限操作'}), 403

        new_username, new_email, new_role = data.get('username'), data.get('email'), data.get('userRole')
        cursor.execute("UPDATE Users SET Username = ?, Email = ?, UserRole = ? WHERE UserID = ?",
                       new_username, new_email, new_role, user_id_to_edit)
        
        msg = f"【管理员通知】您的账户信息已被管理员修改。新用户名: {new_username}, 新邮箱: {new_email}, 新角色: {new_role}。"
        create_notification(cursor, user_id_to_edit, msg)

        conn.commit()
        return jsonify({'success': True, 'message': '用户信息更新成功'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'更新失败: {e}'}), 500
    finally:
        conn.close()

# =========================
# 物品详情接口
# =========================
# 单个物品详情获取

@app.route('/api/item/<string:item_id>', methods=['GET'])
def get_item_detail(item_id):
    """
    获取单个物品的详细信息。
    接收物品ID，返回该物品的所有相关信息。
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': '数据库连接失败'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT i.*, u.Username as posterUsername FROM Items i LEFT JOIN Users u ON i.UserID = u.UserID WHERE i.ItemID = ?", item_id)
        item = cursor.fetchone()
        if not item:
            return jsonify({'success': False, 'message': '未找到该物品'}), 404
        columns = [column[0] for column in cursor.description]
        item_dict = dict(zip(columns, item))
        return jsonify({'success': True, 'item': item_dict})
    except Exception as e:
        print(f"Get item detail error: {e}")
        return jsonify({'success': False, 'message': '服务器错误'}), 500
    finally:
        conn.close()

# =========================
# 主程序入口
# =========================
if __name__ == '__main__':
    """
    主程序入口，启动 Flask 服务。
    """
    app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)