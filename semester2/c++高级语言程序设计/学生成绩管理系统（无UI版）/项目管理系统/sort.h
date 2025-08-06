#include<iostream>

using namespace std;
Student stu[100];
int menu_sort() {
	char c;
	do {
		system("cls");
		cout << "******************************************************" << endl;
		cout << "--------------------欢迎使用排序系统-------------------" << endl;
		cout << "    *          【1】按平均分排序                  *    " << endl;
		cout << "    *          【2】按电子技术排序                *    " << endl;
		cout << "    *          【3】按c++排序                     *    " << endl;
		cout << "    *          【4】按多媒体排序                  *    " << endl;
		cout << "    *          【5】按大学英语排序                *    " << endl;
		cout << "    *          【6】按高等数学排序                *    " << endl;
		cout << "    *          【7】按大学体育排列                *    " << endl;
		cout << "    *          【8】按马克思主义基本原理排序      *    " << endl;
		cout << "    *          【0】退出排序系统                  *    " << endl;
		cout << "******************************************************" << endl;
		cout << "请选择您的操作 (0-8):" << endl;
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
			cout << endl << "================感谢您使用排序系统==============\n" << endl;
			flag = 0;
		}
		if (!flag)
			break;
	}
}