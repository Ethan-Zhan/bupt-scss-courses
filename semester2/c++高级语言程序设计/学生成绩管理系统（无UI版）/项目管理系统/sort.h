#include<iostream>

using namespace std;
Student stu[100];
int menu_sort() {
	char c;
	do {
		system("cls");
		cout << "******************************************************" << endl;
		cout << "--------------------��ӭʹ������ϵͳ-------------------" << endl;
		cout << "    *          ��1����ƽ��������                  *    " << endl;
		cout << "    *          ��2�������Ӽ�������                *    " << endl;
		cout << "    *          ��3����c++����                     *    " << endl;
		cout << "    *          ��4������ý������                  *    " << endl;
		cout << "    *          ��5������ѧӢ������                *    " << endl;
		cout << "    *          ��6�����ߵ���ѧ����                *    " << endl;
		cout << "    *          ��7������ѧ��������                *    " << endl;
		cout << "    *          ��8�������˼�������ԭ������      *    " << endl;
		cout << "    *          ��0���˳�����ϵͳ                  *    " << endl;
		cout << "******************************************************" << endl;
		cout << "��ѡ�����Ĳ��� (0-8):" << endl;
		c = getchar();
	} while (c < '0' || c > '8');
	return (c - '0');
}

void main_sort() {
	int flag = 1;
	for (;;) {
		switch (menu_sort()) {
		case 1:
			Sort(stu, 1);
			break;
		case 2:
			Sort(stu, 2);
			break;
		case 3:
			Sort(stu, 3);
			break;
		case 4:
			Sort(stu, 4);
			break;
		case 5:
			Sort(stu, 5);
			break;
		case 6:
			Sort(stu, 6);
			break;
		case 7:
			Sort(stu, 7);
			break;
		case 8:
			Sort(stu, 8);
			break;
		case 0:
			cout << endl << "================��л��ʹ������ϵͳ==============\n" << endl;
			flag = 0;
		}
		if (!flag)
			break;
	}
}