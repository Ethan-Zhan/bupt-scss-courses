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
	cout << endl << "======>>    请输入学生成绩    <<======" << endl;
	while (sign != 'n' && sign != 'N') {

		cout << "班级：";
		cin >> stu[ig].class_0;
		int temp = (int)strlen(stu[ig].class_0);
		while (temp != 10) {
			cout << "班级格式错误，请重新输入班级" << endl;
			cin >> stu[ig].class_0;
			temp = (int)strlen(stu[ig].class_0);
		}
	loop:
		cout << "学号：";
		cin >> stu[ig].num;
		int c = 0;
		while (c < ig) {
			c++;
			if (stu[ig].num == stu[ig - c].num) {
				cout << "您输入的学号已存在！请重新输入学号。" << endl;
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
				cout << "学号格式错误，请重新输入学号" << endl;
				temp1 = 0;
				goto loop;
			}
		}
		cout << "姓名：";
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
		cout << " 平均分为：" << stu[ig].average << endl;
		cout << "======>>    提示：是否继续写入学生成绩 ?(y/n)";
		cin >> sign;
		ig++;
	}
	Write(stu, ig);
}

void Statistic(Student stu[]) {
	system("cls");
	int n = Read(stu);
	cout << endl << "======>>    输出学生统计数据    <<======\n" << endl;
	cout << "-----------------------------------------------" << endl;
	cout << "   班级   " << "\t" << "   学号   " << "\t" << "姓名" << "\t" << "平均分" << endl;
	cout << "-----------------------------------------------" << endl;
	for (int i = 0; i < n; i++)
		cout << stu[i].class_0 << "\t" << stu[i].num << "\t" << stu[i].name << "\t" << stu[i].average << endl;
	cout << "-----------------------------------------------" << endl;
	system("pause");
}


int lookup_menu() {
	int x;
	system("cls");
	cout << "输入要查找的科目" << endl;
	cout << "******************************************************" << endl;
	cout << "    *          【1】查询平均分                    *    " << endl;
	cout << "    *          【2】电子技术                      *    " << endl;
	cout << "    *          【3】c++                           *    " << endl;
	cout << "    *          【4】多媒体                        *    " << endl;
	cout << "    *          【5】大学英语                      *    " << endl;
	cout << "    *          【6】高等数学                      *    " << endl;
	cout << "    *          【7】大学体育                      *    " << endl;
	cout << "    *          【8】马克思主义基本原理            *    " << endl;
	cout << "    *          【9】全部科目                      *    " << endl;
	cout << "    *          【0】退出查看系统                  *    " << endl;
	cout << "******************************************************" << endl;
	cout << "请选择您的操作 (0-8):" << endl;
	cin >> x;
	return x;
}
void Lookup(Student stu[]) {
	system("cls");
	int n = Read(stu);
	int s;
	int i = 0;
	cout << endl << "======>>    查找学生成绩    <<======" << endl;
	int count = 1;
	char judge;
	//cout << "请输入要查找学生的学号：";
	do{
		cout << "请输入要查找学生的学号：";
		cin >> s;
		i = 0;
		while ((stu[i].num - s) != 0 && i < n)i++;
		if (i == n) {
			cout << "======>>    对不起，无法找到该学生......    <<======" << endl;
			cout << "是否继续查看(y/n)" << endl;
			cin >> judge;
			if (judge == 'n')count = 0;
		}
		else {
			int search;
			do {
				search = lookup_menu();
				if (search == 1) {
					cout << "----------------------------" << endl;
					cout << "平均分：" << stu[i].average << endl;
				}
				if (search == 2) {
					cout << "----------------------------" << endl;
					cout << "电子技术：" << stu[i].elec << endl;
				}
				if (search == 3) {
					cout << "----------------------------" << endl;
					cout << "C++程序设计：" << stu[i].c_program << endl;
				}
				if (search == 4) {
					cout << "----------------------------" << endl;
					cout << "多媒体技术：" << stu[i].media << endl;
				}
				if (search == 5) {
					cout << "----------------------------" << endl;
					cout << "大学英语：" << stu[i].english << endl;
				}
				if (search == 6) {
					cout << "----------------------------" << endl;
					cout << "高等数学：" << stu[i].math << endl;
				}
				if (search == 7) {
					cout << "----------------------------" << endl;
					cout << "大学体育：" << stu[i].sport << endl;
				}
				if (search == 8) {
					cout << "----------------------------" << endl;
					cout << "马克思主义基本原理：" << stu[i].polity << endl;
				}
				if (search == 9) {
					cout << "----------------------------" << endl;
					cout << "班级：" << stu[i].class_0 << endl;
					cout << "学号：" << stu[i].num << endl;
					cout << "姓名：" << stu[i].name << endl;
					cout << "电子技术：" << stu[i].elec << endl;
					cout << "C++程序设计：" << stu[i].c_program << endl;
					cout << "多媒体技术：" << stu[i].media << endl;
					cout << "大学英语：" << stu[i].english << endl;
					cout << "高等数学：" << stu[i].math << endl;
					cout << "大学体育：" << stu[i].sport << endl;
					cout << "马克思主义基本原理：" << stu[i].polity << endl;
					cout << "平均分：" << stu[i].average << endl;
				}
				if (search == 0) {
					cout << endl << "================感谢您使用查看系统==============\n" << endl;
					break;
				}
				cout << "是否继续查看(y/n)" << endl;
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
	cout << endl << "======>>    修改学生成绩    <<======" << endl;
	cout << "请输入要修改成绩学生的学号：";
	cin >> s;
	while ((stu[i].num - s) != 0 && i < n)i++;
	if (i == n) {
		cout << "======>>    对不起，无法找到该学生......    <<======" << endl;
	}
	else {
		cout << "------------------------------------------------------------------------------------" << endl;
		cout << "班级" << "\t" << "学号" << "\t" << "姓名" << "\t"
			<< "电子" << "\t" << "C++" << "\t" << "多媒体" << "\t"
			<< "英语" << "\t" << "数学" << "\t" << "体育" << "\t"
			<< "政治" << "\t" << "平均分" << endl;
		menu_modify();
		cout << "请选择需要为学号为" << s << "的同学修改的科目";
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
		cout << "======>>    是否保存数据 ？(y/n)";
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
	cout << endl << "======>>    删除学生成绩    <<======" << endl;
	cout << "请输入要删除的学生的学号：";
	cin >> s;
	while ((stu[i].num - s) != 0 && i < n)i++;
	if (i == n) {
		cout << "======>>    对不起，无法找到该学生......    <<======" << endl;
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
		cout << "======>>    提示：已成功删除！" << endl;
	}
	Write(stu, n - 1);
}

int igg = 0;
void Insert(Student stu[]) {
	system("cls");
	int n = Read(stu);   //加数组
	char s = '0';   //判断
	cout << endl << "=======>>    增加学生成绩    <<========" << endl;
	while (s != 'n' && s != 'N') {
		cout << "班级：";
		cin >> stu[n].class_0;
		int temp = (int)strlen(stu[n].class_0);
		while (temp != 10) {
			cout << "班级格式错误，请重新输入" << endl;
			cin >> stu[n].class_0;
		}
		cout << "学号：";
		cin >> stu[n].num;
		int c = 0;
		while (c < n) {
			if (stu[n].num == stu[c].num) {
				cout << "您输入的学号已存在！请重新输入。" << endl;
				cin >> stu[n].num;
				c = -1;
			}
			c++;

		}
		cout << "姓名：";
		cin >> stu[n].name;
		cout << "电子技术成绩：";
		cin >> stu[n].elec;
		while (stu[n].elec > 100 || stu[n].elec < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
			cin >> stu[n].elec;
		}
		cout << "C++成绩：";
		cin >> stu[n].c_program;
		while (stu[n].c_program > 100 || stu[n].c_program < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
			cin >> stu[n].c_program;
		}
		cout << "多媒体技术成绩：";
		cin >> stu[n].media;
		while (stu[n].media > 100 || stu[n].media < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
			cin >> stu[n].media;
		}
		cout << "大学英语成绩：";
		cin >> stu[n].english;
		while (stu[n].english > 100 || stu[n].english < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
			cin >> stu[n].english;
		}
		cout << "高等数学成绩：";
		cin >> stu[n].math;
		while (stu[n].math > 100 || stu[n].math < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
			cin >> stu[n].math;
		}
		cout << "大学体育成绩：";
		cin >> stu[n].sport;
		while (stu[n].sport > 100 || stu[n].sport < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
			cin >> stu[n].sport;
		}
		cout << "马克思主义基本原理成绩：";
		cin >> stu[n].polity;
		while (stu[n].polity > 100 || stu[n].polity < 1) {
			cout << " 对不起，请输入1-100之间的数字！！\n";
			cin >> stu[n].polity;
		}
		stu[n].average = (stu[n].elec + stu[n].c_program + stu[n].media +
			stu[n].english + stu[n].math + stu[n].sport + stu[n].polity) / 7;
		cout << "平均分：" << stu[n].average << endl;
		n++;
		cout << "======>>    是否继续插入(y/n)";
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
	cout << "   班级   " << "\t" << "   学号   " << "\t" << "姓名" << "\t"
		<< "电子" << "\t" << "C++" << "\t" << "多媒体" << "\t"
		<< "英语" << "\t" << "数学" << "\t" << "体育" << "\t"
		<< "政治" << "\t" << "平均分" << endl;
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
	cout << endl << "======>>    显示全部学生成绩    <<======" << endl;
	if (!stu) {
		cout << "没有记录";
	}
	else {
		cout << "-------------------------------------------------------------------------------------------------------" << endl;
		cout << "   班级   " << "\t" << "   学号   " << "\t" << "姓名" << "\t"
			<< "电子" << "\t" << "C++" << "\t" << "多媒体" << "\t"
			<< "英语" << "\t" << "数学" << "\t" << "体育" << "\t"
			<< "政治" << "\t" << "平均分" << endl;
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
