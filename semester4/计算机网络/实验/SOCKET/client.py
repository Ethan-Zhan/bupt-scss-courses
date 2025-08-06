import socket
import ssl
import sys

def start_client():
    # 1. 解析命令行参数
    if len(sys.argv) != 2:
        print("用法: python client.py <服务器IP>")
        sys.exit(1)

    SERVER_HOST = sys.argv[1]
    SERVER_PORT = 34000

    print(f"尝试连接到服务器 {SERVER_HOST}:{SERVER_PORT}")

    # 2. 创建 Socket
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # SSL 上下文配置
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_REQUIRED
    context.load_verify_locations('cert.pem')  # 指向你服务器的自签名证书

    client_socket = context.wrap_socket(client_socket, server_hostname=SERVER_HOST)

    try:
        # 3. 建立连接
        client_socket.connect((SERVER_HOST, SERVER_PORT))
        print(f"成功连接到服务器 {SERVER_HOST}:{SERVER_PORT}")
        print("请输入要请求的文件名，输入 '!!!' 可退出。")

        while True:
            # 4. 读取用户输入的文件名
            REQUESTED_FILENAME = input("请输入文件名：").strip()
            if REQUESTED_FILENAME == "!!!":
                print("收到退出指令，断开连接。")
                break

            if not REQUESTED_FILENAME:
                print("文件名不能为空，请重新输入。")
                continue

            # 5. 发送文件名请求
            client_socket.sendall(REQUESTED_FILENAME.encode('utf-8'))

            # 6. 接收响应头
            response_header = client_socket.recv(1024).decode('utf-8')

            if response_header.startswith("OK:"):
                try:
                    file_size = int(response_header.split(":")[1])
                    print(f"服务器响应 OK, 文件大小: {file_size} 字节")

                    local_filename = REQUESTED_FILENAME + ".bak"
                    print(f"开始接收文件并保存为: {local_filename}")

                    bytes_received = 0
                    with open(local_filename, 'wb') as f:
                        while bytes_received < file_size:
                            chunk = client_socket.recv(min(4096, file_size - bytes_received))
                            if not chunk:
                                break
                            f.write(chunk)
                            bytes_received += len(chunk)

                    print(f"文件接收完毕，共接收 {bytes_received} 字节")
                    print(f"新文件名: {local_filename}")
                    print(f"传输总字节数: {bytes_received}")

                except Exception as e:
                    print(f"处理文件接收时发生错误: {e}")
                    print("输出：差错报告")

            elif response_header.startswith("Error:"):
                error_msg = response_header[len("Error:"):]
                print(f"服务器返回错误: {error_msg.strip()}")

            else:
                print(f"接收到未知响应头部: {response_header.strip()}")

    except ConnectionRefusedError:
        print(f"连接到服务器 {SERVER_HOST}:{SERVER_PORT} 被拒绝。请确保服务器已运行。")
    except socket.gaierror:
        print(f"无法解析服务器地址: {SERVER_HOST}")
    except Exception as e:
        print(f"客户端发生错误: {e}")
    finally:
        print("关闭连接")
        client_socket.close()

if __name__ == '__main__':
    start_client()
