import pandas as pd
import numpy as np

class Excel_join:
    def __init__(self, filenames):
        self.dataframes = {}
        self.already_joined = []
        for file in filenames:
            try:
                df = pd.read_csv('uploads/' + file)
            except UnicodeDecodeError:
                df = pd.read_csv('uploads/' + file, encoding = "ISO-8859-1")
            self.dataframes[file] = df
        self.redundant_cols = []
        self.joined = None

    def join(self, file1, file2, column1, column2):
        df1 = self.dataframes[file1]
        df2 = self.dataframes[file2]
        if self.joined is None:
            self.joined = df1.merge(right=df2, how='outer', left_on=column1,right_on=column2)
            self.already_joined.append(file1)
            self.already_joined.append(file2)
            self.redundant_cols += column2
        else:
            if file1 not in self.already_joined:
                self.joined = self.joined.merge(right=df1, how = 'outer', left_on=column2, right_on=column1)
                self.already_joined.append(file1)
                self.redundant_cols += column1
            elif file2 not in self.already_joined:
                self.joined = self.joined.merge(right=df2, how = 'outer', left_on=column1, right_on=column2)
                self.already_joined.append(file2)
                self.redundant_cols += column2

    def delete_duplicate_cols(self):
        self.joined.drop(self.redundant_cols, axis=1, inplace=True)

    def publish(self):
        self.joined.to_csv("result/joined.csv", index=False)

    def get_headers(self, filename):
        df = self.dataframes[filename]
        return list(df.columns)

    def remove_file(self, filename):
        self.dataframes.pop(filename)
