#include <iostream>
#include <fstream>
#include <string>
#include"student.h"
#include"sort.h"

using namespace std;

void main_sort();
void menu_modify();
int menu();
int menu_sort();



int main() {
	for (;;) {
		switch (menu()) {
		case 1:
			Input(stu);
			break;
		case 2:
			Statistic(stu);
			break;
		case 3:
			Lookup(stu);
			system("pause");
			break;
		case 4:
			Modify(stu);
			system("pause");
			break;
		case 5:
			Delete(stu);
			system("pause");
			break;
		case 6:
			Insert(stu);
			system("pause");
			break;
		case 7:
			main_sort();
			system("pause");
			break;
		case 8:
			Output(stu);
			system("pause");
			break;
		case 0:
			cout << endl << "================��л��ʹ��ѧ���ɼ�����ϵͳ==============\n" << endl;
			exit(0);
		}
	}
	return 0;
}

int menu(){
	char c;
	do {
		system("cls");
		cout << "******************************************************" << endl;
		cout << "----------------��ӭʹ��ѧ���ɼ�����ϵͳ---------------" << endl;
		cout << "    *          ��1������ѧ���ɼ�                  *    " << endl;
		cout << "    *          ��2����ʾͳ������                  *    " << endl;
		cout << "    *          ��3������ѧ���ɼ�                  *    " << endl;
		cout << "    *          ��4���޸�ѧ���ɼ�                  *    " << endl;
		cout << "    *          ��5��ɾ��ѧ���ɼ�                  *    " << endl;
		cout << "    *          ��6������ѧ���ɼ�                  *    " << endl;
		cout << "    *          ��7����������ϵͳ                  *    " << endl;
		cout << "    *          ��8����ʾѧ���ɼ�                  *    " << endl;
		cout << "    *          ��0���˳�����ϵͳ                  *    " << endl;
		cout << "******************************************************" << endl;
		cout << "��ѡ�����Ĳ��� (0-8):" << endl;
		c = getchar();
	} while (c < '0' || c > '8');
	return (c - '0'); 
}