import socket
import ssl
import os

HOST = '0.0.0.0'
PORT = 34000

def handle_client(client_socket, client_address):
    """处理单个客户端连接"""
    print(f"接受来自 {client_address} 的连接")

    try:
        while True:
            # 1. 接收客户端请求的文件名
            data = client_socket.recv(1024)
            if not data:
                print(f"{client_address} 断开连接")
                break

            filename = data.decode('utf-8').strip()
            print(f"客户端请求文件: {filename}")

            # 退出命令
            if filename == "!!!":
                print(f"客户端 {client_address} 请求退出")
                break

            # 2. 检查文件是否存在
            if not os.path.exists(filename) or not os.path.isfile(filename):
                print(f"文件 '{filename}' 不存在或不是一个文件")
                error_msg = f"Error: File '{filename}' not found."
                client_socket.sendall(error_msg.encode('utf-8'))
                continue  # 等待下一个请求

            # 3. 发送文件
            print(f"开始传输文件: {filename}")
            file_size = os.path.getsize(filename)
            client_socket.sendall(f"OK:{file_size}".encode('utf-8'))

            with open(filename, 'rb') as f:
                bytes_sent = 0
                while True:
                    chunk = f.read(4096)
                    if not chunk:
                        break
                    client_socket.sendall(chunk)
                    bytes_sent += len(chunk)

            print(f"文件 '{filename}' 传输完毕，共发送 {bytes_sent} 字节.")

    except Exception as e:
        print(f"处理客户端 {client_address} 时发生错误: {e}")
        try:
            client_socket.sendall(f"Error: Server processing failed - {e}".encode('utf-8'))
        except:
            pass

    finally:
        client_socket.close()
        print(f"关闭与 {client_address} 的连接")



def start_server():
    # 1. 创建 Socket (IPv4, TCP)
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # 2. 绑定地址和端口
    server_address = (HOST, PORT)
    server_socket.bind(server_address)
    print(f"服务器绑定到 {server_address}")

    # 3. 监听连接请求
    server_socket.listen(5)
    # 创建一个用于 TLS 的 SSL 上下文对象（服务器端使用）
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)

    # 加载服务器的证书和私钥，用于加密通信
    context.load_cert_chain(certfile='cert.pem', keyfile='key.pem')

    # 用 SSL 封装原始 socket，使其支持安全通信
    server_socket = context.wrap_socket(server_socket, server_side=True)
    print("服务器开始监听...")

    # 服务器主循环，持续接受连接
    while True:
        # 4. 接受客户端连接 (阻塞式)
        client_socket, client_address = server_socket.accept()

        # 可以在这里创建新线程或进程来处理 handle_client
        handle_client(client_socket, client_address)

# 在程序入口调用启动服务器函数
if __name__ == '__main__':
    start_server()