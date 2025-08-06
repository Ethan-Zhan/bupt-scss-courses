#include<iostream>
using namespace std;

class Student {
public:
	void input_elec();
	void input_c_program();
	void input_media();
	void input_english();
	void input_math();
	void input_sport();
	void input_polity();
	friend void Input(Student stu[]);
	friend void Statistic(Student stu[]);
	friend void Lookup(Student stu[]);
	friend void Modify(Student stu[]);
	friend void Delete(Student stu[]);
	friend void Output(Student stu[]);
	friend void Insert(Student stu[]);
	friend void Sort(Student stu[],int n);
	friend void Write(Student stu[], int n);
	friend int Read(Student stu[]);
	float get_average() {
		return average;
	}
	float get_elec() {
		return elec;
	}
	float get_c_progarm() {
		return c_program;
	}
	float get_english() {
		return english;
	}
	float get_math() {
		return math;
	}
	float get_media() {
		return media;
	}
	float get_sport() {
		return sport;
	}
	float get_polity() {
		return polity;
	}
private:
	long long num;
	char name[8];
	char class_0[20];
	float elec;
	float c_program;
	float english;
	float math;
	float media;
	float sport;
	float polity;
	float average;
	int order;
};
