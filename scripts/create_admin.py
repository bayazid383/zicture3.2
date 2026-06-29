import os
import sys
try:
    import mysql.connector
    from werkzeug.security import generate_password_hash
except Exception as e:
    print('Missing dependencies:', e)
    sys.exit(1)

admin_email = os.getenv('ADMIN_EMAIL', 'admin@zicture.com').strip().lower()
admin_password = os.getenv('ADMIN_PASSWORD', 'Admin123!').strip()

cfg = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'zicture'),
    'charset': 'utf8mb4',
    'use_unicode': True,
}

print('Using DB config host=%s user=%s db=%s' % (cfg['host'], cfg['user'], cfg['database']))
try:
    cnx = mysql.connector.connect(**cfg)
    cur = cnx.cursor()
    cur.execute("SELECT COUNT(*) FROM users WHERE email=%s AND role='admin'", (admin_email,))
    exists = cur.fetchone()[0] > 0
    pw_hash = generate_password_hash(admin_password)
    if exists:
        cur.execute("UPDATE users SET password_hash=%s, provider='email' WHERE email=%s AND role='admin'", (pw_hash, admin_email))
        print('Updated admin password for', admin_email)
    else:
        cur.execute("INSERT INTO users (name,email,password_hash,role) VALUES (%s,%s,%s,'admin')", ('Zicture Admin', admin_email, pw_hash))
        print('Created admin', admin_email)
    cnx.commit()
    cur.close()
    cnx.close()
    print('Admin credentials:', admin_email, admin_password)
except Exception as exc:
    print('Failed to create admin:', exc)
    sys.exit(1)
