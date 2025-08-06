#include<iostream>
#include"student.h"

using namespace std;

void Student::input_elec() {
	int flag = 0;
	do {
		flag = 0;
		cout << "电子技术成绩：";
		cin >> elec;
		if (elec > 100 || elec < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
		}
		else {
			flag = 1;
		}
	} while (flag == 0);
}
void Student::input_c_program() {
	int flag = 0;
	do {
		flag = 0;
		cout << "C++程序设计成绩：";
		cin >> c_program;
		if (c_program > 100 || c_program < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
		}
		else {
			flag = 1;
		}
	} while (flag == 0);
}
void Student::input_media() {
	int flag = 0;
	do {
		flag = 0;
		cout << "多媒体技术成绩：";
		cin >> media;
		if (media > 100 || media < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
		}
		else {
			flag = 1;
		}
	} while (flag == 0);
}
void Student::input_english() {
	int flag = 0;
	do {
		flag = 0;
		cout << "大学英语成绩：";
		cin >> english;
		if (english > 100 || english < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
		}
		else {
			flag = 1;
		}
	} while (flag == 0);
}
void Student::input_math() {
	int flag = 0;
	do {
		flag = 0;
		cout << "高等数学成绩：";
		cin >> math;
		if (math > 100 || math < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
		}
		else {
			flag = 1;
		}
	} while (flag == 0);
}
void Student::input_sport() {
	int flag = 0;
	do {
		flag = 0;
		cout << "大学体育成绩：";
		cin >> sport;
		if (sport > 100 || sport < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
		}
		else {
			flag = 1;
		}
	} while (flag == 0);
}
void Student::input_polity() {
	int flag = 0;
	do {
		flag = 0;
		cout << "马克思主义基本原理成绩：";
		cin >> polity;
		if (polity > 100 || polity < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
		}
		else {
			flag = 1;
		}
	} while (flag == 0);
}