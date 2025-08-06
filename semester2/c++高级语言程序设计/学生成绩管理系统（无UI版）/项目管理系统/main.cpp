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
			cout << endl << "================感谢您使用学生成绩管理系统==============\n" << endl;
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
		cout << "----------------欢迎使用学生成绩管理系统---------------" << endl;
		cout << "    *          【1】输入学生成绩                  *    " << endl;
		cout << "    *          【2】显示统计数据                  *    " << endl;
		cout << "    *          【3】查找学生成绩                  *    " << endl;
		cout << "    *          【4】修改学生成绩                  *    " << endl;
		cout << "    *          【5】删除学生成绩                  *    " << endl;
		cout << "    *          【6】插入学生成绩                  *    " << endl;
		cout << "    *          【7】进入排序系统                  *    " << endl;
		cout << "    *          【8】显示学生成绩                  *    " << endl;
		cout << "    *          【0】退出管理系统                  *    " << endl;
		cout << "******************************************************" << endl;
		cout << "请选择您的操作 (0-8):" << endl;
		c = getchar();
	} while (c < '0' || c > '8');
	return (c - '0'); 
}