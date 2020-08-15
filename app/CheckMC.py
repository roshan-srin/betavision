import numpy
import pandas as pd
from statsmodels.stats.outliers_influence import variance_inflation_factor

def calc_vif(X):
    
    #remove string columns
    labels = list(X.columns)
    X = X.fillna(0)
    Y = pd.DataFrame()
    for l in labels:
        types = [type(x) for x in X[l]]
        #check to make sure strings and booleans are excluded from vif scoring
        if str not in types and bool not in types:
            Y[l] = X[l]

    # Calculating VIF
    vif = pd.DataFrame()
    vif["variables"] = Y.columns
    vif["VIF"] = [variance_inflation_factor(Y.values, i) for i in range(Y.shape[1])]
    
    #check VIF scores:
    check = (vif['VIF'] > 5)
    count = 0
    for ch in check:
        if ch:
            count += 1
            
    return count, 'There are '+str(count)+' columns that are highly correlated. This can cause overfitting in your dataset.'
