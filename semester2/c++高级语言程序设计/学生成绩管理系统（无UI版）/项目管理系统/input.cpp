#include<iostream>
#include"student.h"

using namespace std;

void Student::input_elec() {
	int flag = 0;
	do {
		flag = 0;
		cout << "���Ӽ����ɼ���";
		cin >> elec;
		if (elec > 100 || elec < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
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
		cout << "C++������Ƴɼ���";
		cin >> c_program;
		if (c_program > 100 || c_program < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
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
		cout << "��ý�弼���ɼ���";
		cin >> media;
		if (media > 100 || media < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
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
		cout << "��ѧӢ��ɼ���";
		cin >> english;
		if (english > 100 || english < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
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
		cout << "�ߵ���ѧ�ɼ���";
		cin >> math;
		if (math > 100 || math < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
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
		cout << "��ѧ�����ɼ���";
		cin >> sport;
		if (sport > 100 || sport < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
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
		cout << "���˼�������ԭ��ɼ���";
		cin >> polity;
		if (polity > 100 || polity < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
		}
		else {
			flag = 1;
		}
	} while (flag == 0);
}