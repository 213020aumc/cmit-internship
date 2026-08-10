// Task 1

const students = [
  { id: 1, name: "Ali", marks: [70, 80, 65] },
  { id: 2, name: "Sara", marks: [90, 85, 88] },
  { id: 3, name: "John", marks: [45, 55, 50] },
];

function calculateAverage(students) {
  return students.map((student) => {
    const total = student.marks.reduce((sum, mark) => {
      return sum + mark;
    }, 0);

    const average = total / student.marks.length;

    return {
      ...student,
      average,
    };
  });
}

const studentsWithAverage = calculateAverage(students);

// console.log(studentsWithAverage);

function addGrades(students) {
  return students.map((student) => {
    let grade;
    if (student.average >= 80) {
      grade = "A";
    } else if (student.average >= 60) {
      grade = "B";
    } else if (student.average >= 40) {
      grade = "C";
    } else {
      grade = "F";
    }
    return {
      ...student,
      grade,
    };
  });
}

const studentsWithGrades = addGrades(studentsWithAverage);

// console.log(studentsWithGrades);

function getPassedStudents(students) {
  return students.filter((student) => student.average >= 40);
}

// console.log(getPassedStudents(studentsWithGrades));

function sortStudents(students) {
  return [...students].sort((a, b) => b.average - a.average);
}

// console.log(sortStudents(studentsWithGrades));

function highestScorer(students) {
  return sortStudents(students)[0];
}

// console.log(highestScorer(studentsWithGrades));

function classAverage(students) {
  const total = students.reduce((sum, student) => {
    return sum + student.average;
  }, 0);

  return total / students.length;
}

// console.log(classAverage(studentsWithGrades));
