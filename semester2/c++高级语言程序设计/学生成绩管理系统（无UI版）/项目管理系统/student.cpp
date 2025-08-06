#if defined(_MSC_VER) && !defined(_CRT_SECURE_NO_DEPRECATE)
#define _CRT_SECURE_NO_DEPRECATE
#endif
#include <iostream>
#include <fstream>
#include <string>
#include<algorithm>
#include"student.h"
#include"menu_modify.h"

using namespace std;


void Write(Student stu[], int n) {
	fstream myFile;
	myFile.open("score.txt", ios::out | ios::binary);
	if (!myFile) {
		cout << "score.txt can't open!" << endl;
		abort();
	}
	int count = n;
	myFile << count << endl << endl;
	for (int i = 0; i < count; i++) {
		myFile << stu[i].class_0 << "\t"
			<< stu[i].num << "\t"
			<< stu[i].name << "\t"
			<< stu[i].elec << "\t"
			<< stu[i].c_program << "\t"
			<< stu[i].media << "\t"
			<< stu[i].english << "\t"
			<< stu[i].math << "\t"
			<< stu[i].sport << "\t"
			<< stu[i].polity << "\t"
			<< stu[i].average << endl;
	}
	myFile.close();
}

int Read(Student stu[]) {
	fstream myFile;
	myFile.open("score.txt", ios::in | ios::binary);
	if (!myFile) {
		cout << "score.txt can't open!" << endl;
		abort();
	}
	int count;
	myFile.seekg(0);
	myFile >> count;
	for (int i = 0; i <= count; i++) {
		myFile >> stu[i].class_0 >> stu[i].num >> stu[i].name
			>> stu[i].elec >> stu[i].c_program >> stu[i].media
			>> stu[i].english >> stu[i].math >> stu[i].sport
			>> stu[i].polity >> stu[i].average;
	}
	myFile.close();
	return count;
}
int ig = 0;
void Input(Student stu[]) {
	system("cls");
	int flag;
	char sign = '0';
	cout << endl << "======>>    ������ѧ���ɼ�    <<======" << endl;
	while (sign != 'n' && sign != 'N') {

		cout << "�༶��";
		cin >> stu[ig].class_0;
		int temp = (int)strlen(stu[ig].class_0);
		while (temp != 10) {
			cout << "�༶��ʽ��������������༶" << endl;
			cin >> stu[ig].class_0;
			temp = (int)strlen(stu[ig].class_0);
		}
	loop:
		cout << "ѧ�ţ�";
		cin >> stu[ig].num;
		int c = 0;
		while (c < ig) {
			c++;
			if (stu[ig].num == stu[ig - c].num) {
				cout << "�������ѧ���Ѵ��ڣ�����������ѧ�š�" << endl;
				goto loop;
			}
		}
		int temp1 = 0;
		while (temp1 != 10) {
			long long int temp2 = stu[ig].num;
			for (temp2; temp2 > 0; temp2 /= 10) {
				temp1++;
			}
			if (temp1 != 10) {
				cout << "ѧ�Ÿ�ʽ��������������ѧ��" << endl;
				temp1 = 0;
				goto loop;
			}
		}
		cout << "������";
		cin >> stu[ig].name;
		stu[ig].input_elec();
		stu[ig].input_c_program();
		stu[ig].input_media();
		stu[ig].input_english();
		stu[ig].input_math();
		stu[ig].input_sport();
		stu[ig].input_polity();

		stu[ig].average = (stu[ig].elec + stu[ig].c_program + stu[ig].media + stu[ig].english + stu[ig].math +
			stu[ig].sport + stu[ig].polity) / 7;
		cout << " ƽ����Ϊ��" << stu[ig].average << endl;
		cout << "======>>    ��ʾ���Ƿ����д��ѧ���ɼ� ?(y/n)";
		cin >> sign;
		ig++;
	}
	Write(stu, ig);
}

void Statistic(Student stu[]) {
	system("cls");
	int n = Read(stu);
	cout << endl << "======>>    ���ѧ��ͳ������    <<======\n" << endl;
	cout << "-----------------------------------------------" << endl;
	cout << "   �༶   " << "\t" << "   ѧ��   " << "\t" << "����" << "\t" << "ƽ����" << endl;
	cout << "-----------------------------------------------" << endl;
	for (int i = 0; i < n; i++)
		cout << stu[i].class_0 << "\t" << stu[i].num << "\t" << stu[i].name << "\t" << stu[i].average << endl;
	cout << "-----------------------------------------------" << endl;
	system("pause");
}


int lookup_menu() {
	int x;
	system("cls");
	cout << "����Ҫ���ҵĿ�Ŀ" << endl;
	cout << "******************************************************" << endl;
	cout << "    *          ��1����ѯƽ����                    *    " << endl;
	cout << "    *          ��2�����Ӽ���                      *    " << endl;
	cout << "    *          ��3��c++                           *    " << endl;
	cout << "    *          ��4����ý��                        *    " << endl;
	cout << "    *          ��5����ѧӢ��                      *    " << endl;
	cout << "    *          ��6���ߵ���ѧ                      *    " << endl;
	cout << "    *          ��7����ѧ����                      *    " << endl;
	cout << "    *          ��8�����˼�������ԭ��            *    " << endl;
	cout << "    *          ��9��ȫ����Ŀ                      *    " << endl;
	cout << "    *          ��0���˳��鿴ϵͳ                  *    " << endl;
	cout << "******************************************************" << endl;
	cout << "��ѡ�����Ĳ��� (0-8):" << endl;
	cin >> x;
	return x;
}
void Lookup(Student stu[]) {
	system("cls");
	int n = Read(stu);
	int s;
	int i = 0;
	cout << endl << "======>>    ����ѧ���ɼ�    <<======" << endl;
	int count = 1;
	char judge;
	//cout << "������Ҫ����ѧ����ѧ�ţ�";
	do{
		cout << "������Ҫ����ѧ����ѧ�ţ�";
		cin >> s;
		i = 0;
		while ((stu[i].num - s) != 0 && i < n)i++;
		if (i == n) {
			cout << "======>>    �Բ����޷��ҵ���ѧ��......    <<======" << endl;
			cout << "�Ƿ�����鿴(y/n)" << endl;
			cin >> judge;
			if (judge == 'n')count = 0;
		}
		else {
			int search;
			do {
				search = lookup_menu();
				if (search == 1) {
					cout << "----------------------------" << endl;
					cout << "ƽ���֣�" << stu[i].average << endl;
				}
				if (search == 2) {
					cout << "----------------------------" << endl;
					cout << "���Ӽ�����" << stu[i].elec << endl;
				}
				if (search == 3) {
					cout << "----------------------------" << endl;
					cout << "C++������ƣ�" << stu[i].c_program << endl;
				}
				if (search == 4) {
					cout << "----------------------------" << endl;
					cout << "��ý�弼����" << stu[i].media << endl;
				}
				if (search == 5) {
					cout << "----------------------------" << endl;
					cout << "��ѧӢ�" << stu[i].english << endl;
				}
				if (search == 6) {
					cout << "----------------------------" << endl;
					cout << "�ߵ���ѧ��" << stu[i].math << endl;
				}
				if (search == 7) {
					cout << "----------------------------" << endl;
					cout << "��ѧ������" << stu[i].sport << endl;
				}
				if (search == 8) {
					cout << "----------------------------" << endl;
					cout << "���˼�������ԭ��" << stu[i].polity << endl;
				}
				if (search == 9) {
					cout << "----------------------------" << endl;
					cout << "�༶��" << stu[i].class_0 << endl;
					cout << "ѧ�ţ�" << stu[i].num << endl;
					cout << "������" << stu[i].name << endl;
					cout << "���Ӽ�����" << stu[i].elec << endl;
					cout << "C++������ƣ�" << stu[i].c_program << endl;
					cout << "��ý�弼����" << stu[i].media << endl;
					cout << "��ѧӢ�" << stu[i].english << endl;
					cout << "�ߵ���ѧ��" << stu[i].math << endl;
					cout << "��ѧ������" << stu[i].sport << endl;
					cout << "���˼�������ԭ��" << stu[i].polity << endl;
					cout << "ƽ���֣�" << stu[i].average << endl;
				}
				if (search == 0) {
					cout << endl << "================��л��ʹ�ò鿴ϵͳ==============\n" << endl;
					break;
				}
				cout << "�Ƿ�����鿴(y/n)" << endl;
				cin >> judge;
				if (judge == 'n') {
					count = 0;
					break;
				}
			} while (search != 0);
		}
	} while (count != 0);
}

void Modify(Student stu[]) {
	system("cls");
	int n = Read(stu);
	int s;
	int i = 0;
	cout << endl << "======>>    �޸�ѧ���ɼ�    <<======" << endl;
	cout << "������Ҫ�޸ĳɼ�ѧ����ѧ�ţ�";
	cin >> s;
	while ((stu[i].num - s) != 0 && i < n)i++;
	if (i == n) {
		cout << "======>>    �Բ����޷��ҵ���ѧ��......    <<======" << endl;
	}
	else {
		cout << "------------------------------------------------------------------------------------" << endl;
		cout << "�༶" << "\t" << "ѧ��" << "\t" << "����" << "\t"
			<< "����" << "\t" << "C++" << "\t" << "��ý��" << "\t"
			<< "Ӣ��" << "\t" << "��ѧ" << "\t" << "����" << "\t"
			<< "����" << "\t" << "ƽ����" << endl;
		menu_modify();
		cout << "��ѡ����ҪΪѧ��Ϊ" << s << "��ͬѧ�޸ĵĿ�Ŀ";
		int k; cin >> k;
		switch (k) {
		case 1:			
			stu[i].input_elec();
			stu[i].input_c_program();
			stu[i].input_media();
			stu[i].input_english();
			stu[i].input_math();
			stu[i].input_sport();
			stu[i].input_polity();
			break;
		case 2:
			stu[i].input_elec();
			break;
		case 3:
			stu[i].input_c_program();
			break;
		case 4:
			stu[i].input_media();
			break;
		case 5:
			stu[i].input_english();
			break;
		case 6:
			stu[i].input_math();
			break;
		case 7:
			stu[i].input_sport();
			break;
		case 8:
			stu[i].input_polity();
			break;
		}
		stu[i].average = (stu[i].elec + stu[i].c_program + stu[i].media +
			stu[i].english + stu[i].math + stu[i].sport + stu[i].polity) / 7;

		char c;
		cout << "======>>    �Ƿ񱣴����� ��(y/n)";
		cin >> c;
		if (c != 'n' && c != 'N')
			Write(stu, n);
	}
}

void Delete(Student stu[]) {
	system("cls");
	int n = Read(stu);
	int s;
	int i = 0, j;
	cout << endl << "======>>    ɾ��ѧ���ɼ�    <<======" << endl;
	cout << "������Ҫɾ����ѧ����ѧ�ţ�";
	cin >> s;
	while ((stu[i].num - s) != 0 && i < n)i++;
	if (i == n) {
		cout << "======>>    �Բ����޷��ҵ���ѧ��......    <<======" << endl;
	}
	else {
		for (j = i; j < n - 1; j++) {
			strcpy(stu[j].class_0, stu[j + 1].class_0);
			stu[j].num = stu[j + 1].num;
			strcpy(stu[j].name, stu[j + 1].name);
			stu[j].elec = stu[j + 1].elec;
			stu[j].c_program = stu[j + 1].c_program;
			stu[j].media = stu[j + 1].media;
			stu[j].english = stu[j + 1].english;
			stu[j].math = stu[j + 1].math;
			stu[j].sport = stu[j + 1].sport;
			stu[j].polity = stu[j + 1].polity;
			stu[j].average = stu[j + 1].average;
		}
		cout << "======>>    ��ʾ���ѳɹ�ɾ����" << endl;
	}
	Write(stu, n - 1);
}

int igg = 0;
void Insert(Student stu[]) {
	system("cls");
	int n = Read(stu);   //������
	char s = '0';   //�ж�
	cout << endl << "=======>>    ����ѧ���ɼ�    <<========" << endl;
	while (s != 'n' && s != 'N') {
		cout << "�༶��";
		cin >> stu[n].class_0;
		int temp = (int)strlen(stu[n].class_0);
		while (temp != 10) {
			cout << "�༶��ʽ��������������" << endl;
			cin >> stu[n].class_0;
		}
		cout << "ѧ�ţ�";
		cin >> stu[n].num;
		int c = 0;
		while (c < n) {
			if (stu[n].num == stu[c].num) {
				cout << "�������ѧ���Ѵ��ڣ����������롣" << endl;
				cin >> stu[n].num;
				c = -1;
			}
			c++;

		}
		cout << "������";
		cin >> stu[n].name;
		cout << "���Ӽ����ɼ���";
		cin >> stu[n].elec;
		while (stu[n].elec > 100 || stu[n].elec < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
			cin >> stu[n].elec;
		}
		cout << "C++�ɼ���";
		cin >> stu[n].c_program;
		while (stu[n].c_program > 100 || stu[n].c_program < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
			cin >> stu[n].c_program;
		}
		cout << "��ý�弼���ɼ���";
		cin >> stu[n].media;
		while (stu[n].media > 100 || stu[n].media < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
			cin >> stu[n].media;
		}
		cout << "��ѧӢ��ɼ���";
		cin >> stu[n].english;
		while (stu[n].english > 100 || stu[n].english < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
			cin >> stu[n].english;
		}
		cout << "�ߵ���ѧ�ɼ���";
		cin >> stu[n].math;
		while (stu[n].math > 100 || stu[n].math < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
			cin >> stu[n].math;
		}
		cout << "��ѧ�����ɼ���";
		cin >> stu[n].sport;
		while (stu[n].sport > 100 || stu[n].sport < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
			cin >> stu[n].sport;
		}
		cout << "���˼�������ԭ��ɼ���";
		cin >> stu[n].polity;
		while (stu[n].polity > 100 || stu[n].polity < 1) {
			cout << " �Բ���������1-100֮������֣���\n";
			cin >> stu[n].polity;
		}
		stu[n].average = (stu[n].elec + stu[n].c_program + stu[n].media +
			stu[n].english + stu[n].math + stu[n].sport + stu[n].polity) / 7;
		cout << "ƽ���֣�" << stu[n].average << endl;
		n++;
		cout << "======>>    �Ƿ��������(y/n)";
		cin >> s;
	}
	Write(stu, n);
}
bool cmp1(Student a,Student b) {
	return a.get_average() > b.get_average();
}
bool cmp2(Student a, Student b) {
	return a.get_elec() > b.get_elec();
}
bool cmp3(Student a, Student b) {
	return a.get_c_progarm() > b.get_c_progarm();
}
bool cmp4(Student a, Student b) {
	return a.get_media() > b.get_media();
}
bool cmp5(Student a, Student b) {
	return a.get_english() > b.get_english();
}
bool cmp6(Student a, Student b) {
	return a.get_math() > b.get_math();
}
bool cmp7(Student a, Student b) {
	return a.get_english() > b.get_english();
}
bool cmp8(Student a, Student b) {
	return a.get_polity() > b.get_polity();
}

void Sort(Student stu[],int k) {
	system("cls");
	int n = Read(stu);
	switch (k) {
	case 1:
		sort(stu, stu + n, cmp1);
		break;
	case 2:
		sort(stu, stu + n, cmp2);
		break;
	case 3:
		sort(stu, stu + n, cmp3);
		break;
	case 4:
		sort(stu, stu + n, cmp4);
		break;
	case 5:
		sort(stu, stu + n, cmp5);
		break;
	case 6:
		sort(stu, stu + n, cmp6);
		break;
	case 7:
		sort(stu, stu + n, cmp7);
		break;
	case 8:
		sort(stu, stu + n, cmp8);
		break;
	}
	cout << "-------------------------------------------------------------------------------------------------------" << endl;
	cout << "   �༶   " << "\t" << "   ѧ��   " << "\t" << "����" << "\t"
		<< "����" << "\t" << "C++" << "\t" << "��ý��" << "\t"
		<< "Ӣ��" << "\t" << "��ѧ" << "\t" << "����" << "\t"
		<< "����" << "\t" << "ƽ����" << endl;
	cout << "-------------------------------------------------------------------------------------------------------" << endl;
	for (int i = 0; i < n; i++) {
		stu[i].order = i + 1;
		cout << stu[i].class_0 << "\t" << stu[i].num << "\t" << stu[i].name << "\t"
			<< stu[i].elec << "\t" << stu[i].c_program << "\t" << stu[i].media << "\t"
			<< stu[i].english << "\t" << stu[i].math << "\t" << stu[i].sport << "\t"
			<< stu[i].polity << "\t" << stu[i].average << endl;
	}
	Write(stu, n);
	system("pause");
}

void Output(Student stu[]) {
	system("cls");
	int n = Read(stu);
	cout << endl << "======>>    ��ʾȫ��ѧ���ɼ�    <<======" << endl;
	if (!stu) {
		cout << "û�м�¼";
	}
	else {
		cout << "-------------------------------------------------------------------------------------------------------" << endl;
		cout << "   �༶   " << "\t" << "   ѧ��   " << "\t" << "����" << "\t"
			<< "����" << "\t" << "C++" << "\t" << "��ý��" << "\t"
			<< "Ӣ��" << "\t" << "��ѧ" << "\t" << "����" << "\t"
			<< "����" << "\t" << "ƽ����" << endl;
		cout << "-------------------------------------------------------------------------------------------------------" << endl;
		for (int i = 0; i < n; i++) {
			cout << stu[i].class_0 << "\t" << stu[i].num << "\t" << stu[i].name << "\t"
				<< stu[i].elec << "\t" << stu[i].c_program << "\t" << stu[i].media << "\t"
				<< stu[i].english << "\t" << stu[i].math << "\t" << stu[i].sport << "\t"
				<< stu[i].polity << "\t" << stu[i].average << endl;
		}
		cout << "-------------------------------------------------------------------------------------------------------" << endl;
	}
}
